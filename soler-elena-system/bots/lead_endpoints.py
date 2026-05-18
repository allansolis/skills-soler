"""
Lead Endpoints — registra los endpoints de lead scoring en cualquier bot Flask.

Uso en cada bot:
    from lead_endpoints import register_lead_endpoints
    register_lead_endpoints(app, business='glass_soler')

Endpoints añadidos:
    GET  /leads/score?user_id=X           - Score de un usuario
    GET  /leads/hot                        - Lista hot leads del business
    GET  /leads/handoffs                   - Lista handoffs del business
    GET  /leads/stats                      - Aggregate stats
    POST /leads/score-message              - Manual score (body: {user_id, message})
    POST /leads/reset                      - Reset user score (body: {user_id})

Todos requieren X-Webhook-Secret header.
"""
import os
from flask import request, jsonify

import lead_scoring

try:
    import notifications
    _HAS_NOTIFICATIONS = True
except ImportError:
    _HAS_NOTIFICATIONS = False


def auto_score(user_id: str, message: str, business: str) -> dict:
    """
    Auto-score un mensaje y dispara notificaciones si corresponde.
    Llamar desde el handler de chat/webhook de cada bot.

    Returns dict con score_actual, signals, needs_handoff, hot_lead.
    """
    result = lead_scoring.score_message(user_id, message, business)

    if not _HAS_NOTIFICATIONS:
        return result

    # Disparar notificaciones (idempotente — solo primera vez para handoff)
    score_info = lead_scoring.get_score(user_id, business)

    if result.get("needs_handoff") and score_info.get("handoff_triggered"):
        # Solo notificar la primera vez (cuando handoff_at == last_update == ahora)
        if score_info.get("handoff_at") == score_info.get("last_update"):
            notifications.notify_handoff(
                business=business,
                user_id=user_id,
                signals=result.get("signals", []),
                last_message=message
            )

    if result.get("hot_lead") and result.get("score_actual") >= lead_scoring.HOT_LEAD_THRESHOLD:
        # Solo notificar cuando crossed el threshold (delta hizo subir el score por encima)
        if result.get("score_actual") - result.get("score_delta", 0) < lead_scoring.HOT_LEAD_THRESHOLD <= result.get("score_actual"):
            notifications.notify_hot_lead(
                business=business,
                user_id=user_id,
                score=result["score_actual"],
                last_message=message,
                signals=result.get("signals", [])
            )

    return result


def _check_auth() -> bool:
    secret = os.environ.get("WEBHOOK_SECRET", "")
    if not secret:
        return True  # No auth configured
    return request.headers.get("X-Webhook-Secret") == secret


def register_lead_endpoints(app, business: str):
    """Registra todos los endpoints de leads en el Flask app."""

    @app.route("/leads/score", methods=["GET"])
    def _get_lead_score():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "Falta user_id"}), 400
        info = lead_scoring.get_score(user_id, business)
        if not info:
            return jsonify({"found": False, "business": business, "user_id": user_id})
        return jsonify({"found": True, **info})

    @app.route("/leads/hot", methods=["GET"])
    def _get_hot_leads():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        min_score = int(request.args.get("min", lead_scoring.HOT_LEAD_THRESHOLD))
        leads = lead_scoring.list_hot_leads(business, min_score=min_score)
        return jsonify({"business": business, "count": len(leads), "leads": leads})

    @app.route("/leads/handoffs", methods=["GET"])
    def _get_handoffs():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        handoffs = lead_scoring.list_handoffs(business)
        return jsonify({"business": business, "count": len(handoffs), "handoffs": handoffs})

    @app.route("/leads/stats", methods=["GET"])
    def _get_stats():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        return jsonify({"business": business, **lead_scoring.stats(business)})

    @app.route("/leads/score-message", methods=["POST"])
    def _score_message_manual():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        message = body.get("message", "")
        if not user_id or not message:
            return jsonify({"error": "Faltan user_id o message"}), 400
        result = lead_scoring.score_message(user_id, message, business)
        return jsonify(result)

    @app.route("/leads/reset", methods=["POST"])
    def _reset_lead():
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401
        body = request.get_json(silent=True) or {}
        user_id = body.get("user_id")
        if not user_id:
            return jsonify({"error": "Falta user_id"}), 400
        ok = lead_scoring.reset_user(user_id, business)
        return jsonify({"reset": ok, "user_id": user_id, "business": business})

    @app.route("/leads/export", methods=["GET"])
    def _export_leads():
        """Export leads en CSV o JSON. Query params: format=csv|json, min_score=N."""
        if not _check_auth():
            return jsonify({"error": "No autorizado"}), 401

        from flask import Response
        fmt = request.args.get("format", "csv").lower()
        min_score = int(request.args.get("min_score", 0))
        all_leads = lead_scoring.list_hot_leads(business, min_score=min_score)

        if fmt == "json":
            return jsonify({"business": business, "count": len(all_leads), "leads": all_leads})

        # CSV default
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "user_id", "business", "score", "messages_count",
            "handoff_triggered", "handoff_at", "created_at", "last_update", "last_signals"
        ])
        for lead in all_leads:
            last_signal = ""
            if lead.get("signals_history"):
                last = lead["signals_history"][-1]
                last_signal = ",".join(last.get("signals", []))
            writer.writerow([
                lead.get("user_id", ""),
                lead.get("business", ""),
                lead.get("score", 0),
                lead.get("messages_count", 0),
                lead.get("handoff_triggered", False),
                lead.get("handoff_at", ""),
                lead.get("created_at", ""),
                lead.get("last_update", ""),
                last_signal,
            ])
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads-{business}.csv"}
        )

    print(f"[lead_endpoints] Registrados 7 endpoints /leads/* para business={business}")
