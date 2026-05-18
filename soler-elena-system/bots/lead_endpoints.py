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

    print(f"[lead_endpoints] Registrados 6 endpoints /leads/* para business={business}")
