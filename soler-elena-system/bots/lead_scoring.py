"""
Lead Scoring + Handoff Detector — modulo compartido para los 4 bots Elena.

API simple:
    from lead_scoring import score_message, should_handoff, get_score

    score = score_message(user_id, message_text, business='glass')
    if should_handoff(user_id):
        # trigger alerta humano
        ...

Persistencia: JSON file en data/leads_scores.json (no requiere DB).
Threadsafe basico con lock.
"""
import os
import json
import re
import threading
from pathlib import Path
from datetime import datetime, timezone

# === Configuracion ===
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
SCORES_FILE = DATA_DIR / "leads_scores.json"

HANDOFF_THRESHOLD = 50
HOT_LEAD_THRESHOLD = 70

_lock = threading.Lock()


# === Reglas de scoring (Spanish patterns) ===
SCORING_RULES = [
    # Senales de alta intencion (positivas)
    (r'\b(?:soy|me llamo|mi nombre es)\s+\w+', 10, 'name_provided'),
    (r'\b\+?506[\s-]?\d{4}[\s-]?\d{4}\b|\b\d{4}[\s-]?\d{4}\b', 20, 'phone_provided'),
    (r'\b(?:cuanto|precio|cuesta|cobran|valor|tarifa|cotiza)', 20, 'asking_price'),
    (r'\b(?:agendar|cita|reunion|visita|cuando|disponibilidad|hora|dia)', 25, 'scheduling'),
    (r'\b(?:presupuesto|dolares|colones|crc|usd|\$\s*\d+|\d+\s*mil|\d+k)\b', 15, 'budget_mention'),
    (r'\b(?:san jose|escazu|santa ana|heredia|cartago|alajuela|guanacaste|limon|puntarenas|curridabat|tamarindo|montezuma|jaco)\b', 10, 'location_mention'),
    (r'\b(?:lo quiero|me interesa|si me interesa|adelante|procedamos|empecemos|firmemos)\b', 25, 'high_intent'),
    (r'\b(?:premium|total security|seguridad full|estandar)\b', 15, 'specific_product_glass'),
    (r'\b(?:aretes|anillo|collar|esmeralda|cadena|dije|pulsera)\b', 15, 'specific_product_esmeraldas'),
    (r'\b(?:toyota|honda|nissan|mazda|hyundai|kia|chevrolet|ford|mitsubishi|subaru|suzuki|chery|geely|byd)\b', 15, 'vehicle_mention'),
    (r'\b(?:apartamento|casa|terreno|condominio|airbnb|alquiler|flip|propiedad|metro|m2)\b', 15, 'property_mention'),
    (r'\b(?:si|claro|por supuesto|ok|dale|listo|perfecto|excelente)\b', 5, 'affirmative'),

    # Senales de problema (negativas)
    (r'\b(?:cancelar|reembolso|reclamo|estafa|fraude|enojado|molesto|terrible|pesimo|horrible)\b', -20, 'complaint'),
    (r'\b(?:fuck|mierda|carajo|hijoputa|imbecil|estupido)\b', -30, 'abusive'),
    (r'\b(?:solo preguntando|por curiosidad|cuando tenga|otro dia|tal vez|pensandolo|no estoy seguro)\b', -10, 'low_intent'),

    # Trigger handoff explicit
    (r'\b(?:hablar con humano|persona real|operador|no quiero un bot|ayuda humana|gerente|supervisor)\b', 100, 'explicit_handoff'),
]


def _load_scores() -> dict:
    if not SCORES_FILE.exists():
        return {}
    try:
        return json.loads(SCORES_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {}


def _save_scores(scores: dict) -> None:
    SCORES_FILE.write_text(json.dumps(scores, indent=2, ensure_ascii=False), encoding='utf-8')


def score_message(user_id: str, message_text: str, business: str = 'unknown') -> dict:
    """
    Procesa un mensaje del usuario, actualiza su score acumulativo.
    Returns dict con: score_actual, score_delta, signals_detectados, hot_lead, needs_handoff
    """
    if not message_text:
        return {'score_actual': 0, 'score_delta': 0, 'signals': [], 'hot_lead': False, 'needs_handoff': False}

    text = message_text.lower()
    delta = 0
    signals = []

    for pattern, points, signal_name in SCORING_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            delta += points
            signals.append({'signal': signal_name, 'points': points})

    with _lock:
        scores = _load_scores()
        user_key = f"{business}:{user_id}"
        existing = scores.get(user_key, {
            'score': 0,
            'business': business,
            'user_id': user_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_update': None,
            'messages_count': 0,
            'signals_history': [],
            'handoff_triggered': False,
        })

        existing['score'] = max(0, existing['score'] + delta)
        existing['last_update'] = datetime.now(timezone.utc).isoformat()
        existing['messages_count'] = existing.get('messages_count', 0) + 1
        existing['signals_history'].append({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'delta': delta,
            'signals': [s['signal'] for s in signals],
            'message_preview': message_text[:60]
        })
        # Mantener solo ultimos 20 signals en historia
        existing['signals_history'] = existing['signals_history'][-20:]

        hot_lead = existing['score'] >= HOT_LEAD_THRESHOLD
        needs_handoff = (existing['score'] >= HANDOFF_THRESHOLD) or any(s['signal'] == 'explicit_handoff' for s in signals)

        if needs_handoff and not existing['handoff_triggered']:
            existing['handoff_triggered'] = True
            existing['handoff_at'] = datetime.now(timezone.utc).isoformat()

        scores[user_key] = existing
        _save_scores(scores)

    return {
        'score_actual': existing['score'],
        'score_delta': delta,
        'signals': [s['signal'] for s in signals],
        'hot_lead': hot_lead,
        'needs_handoff': needs_handoff,
        'messages_count': existing['messages_count']
    }


def get_score(user_id: str, business: str = 'unknown') -> dict:
    """Returns current score info for a user."""
    with _lock:
        scores = _load_scores()
        user_key = f"{business}:{user_id}"
        return scores.get(user_key, {})


def list_hot_leads(business: str = None, min_score: int = HOT_LEAD_THRESHOLD) -> list:
    """Returns list of hot leads, optionally filtered by business."""
    with _lock:
        scores = _load_scores()
        result = []
        for k, v in scores.items():
            if v.get('score', 0) >= min_score:
                if business is None or v.get('business') == business:
                    result.append(v)
        return sorted(result, key=lambda x: x.get('score', 0), reverse=True)


def list_handoffs(business: str = None) -> list:
    """Returns leads that triggered handoff."""
    with _lock:
        scores = _load_scores()
        result = []
        for k, v in scores.items():
            if v.get('handoff_triggered'):
                if business is None or v.get('business') == business:
                    result.append(v)
        return sorted(result, key=lambda x: x.get('handoff_at', ''), reverse=True)


def reset_user(user_id: str, business: str = 'unknown') -> bool:
    """Reset score para un user — util para retesting."""
    with _lock:
        scores = _load_scores()
        user_key = f"{business}:{user_id}"
        if user_key in scores:
            del scores[user_key]
            _save_scores(scores)
            return True
    return False


def stats(business: str = None) -> dict:
    """Returns aggregate stats."""
    with _lock:
        scores = _load_scores()
        filtered = scores.values() if business is None else [v for v in scores.values() if v.get('business') == business]
        return {
            'total_leads': len(filtered),
            'hot_leads': len([v for v in filtered if v.get('score', 0) >= HOT_LEAD_THRESHOLD]),
            'handoffs': len([v for v in filtered if v.get('handoff_triggered')]),
            'avg_score': round(sum(v.get('score', 0) for v in filtered) / max(len(filtered), 1), 2),
            'avg_messages': round(sum(v.get('messages_count', 0) for v in filtered) / max(len(filtered), 1), 1),
        }


if __name__ == '__main__':
    # Self-test
    print('=== Self-test lead_scoring ===\n')
    test_id = 'test_user_demo'
    test_messages = [
        ('Hola', 'glass'),
        ('Me llamo Pedro y vivo en Escazu', 'glass'),
        ('Cuanto cuesta el paquete Premium para mi Toyota Corolla 2018?', 'glass'),
        ('Mi presupuesto son 500 mil colones', 'glass'),
        ('Quiero agendar una cita para el sabado', 'glass'),
    ]

    for msg, biz in test_messages:
        result = score_message(test_id, msg, biz)
        print(f"MSG: {msg[:50]}")
        print(f"  delta=+{result['score_delta']} score_total={result['score_actual']} signals={result['signals']}")
        if result['needs_handoff']:
            print(f"  !!! HANDOFF triggered !!!")
        print()

    print(f"\nStats: {stats('glass')}")
    print(f"\nHot leads: {len(list_hot_leads('glass'))}")
    print(f"Handoffs: {len(list_handoffs('glass'))}")
