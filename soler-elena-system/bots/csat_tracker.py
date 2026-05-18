"""
CSAT Tracker — Customer Satisfaction Tracking automatico.

Detecta inteligentemente cuando una conversacion ha terminado y solicita rating 1-5.
Tambien analiza sentiment de los mensajes para inferir CSAT cuando el usuario no responde rating.

Triggers de solicitud de CSAT:
- Conversacion paso a status "won" o "lost" en el kanban
- 30 min de inactividad post hot lead
- Cliente menciona "gracias por todo", "perfecto, listo", "ya quedo"
- Operador humano marca handoff como "completed"

API:
    from csat_tracker import request_csat, record_rating, infer_sentiment

    # Pedir rating
    csat_msg = request_csat(business='glass_soler', user_id='abc')

    # Registrar rating recibido
    record_rating(business='glass_soler', user_id='abc', rating=5, comment='Excelente atencion')

    # Inferir sentiment de los mensajes (si no dieron rating)
    sentiment = infer_sentiment(business='glass_soler', user_id='abc')
"""
import os
import re
import json
import threading
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
CSAT_FILE = DATA_DIR / "csat_ratings.json"

_lock = threading.Lock()


# Mensajes de solicitud de rating personalizados por bot
CSAT_REQUEST_MESSAGES = {
    "glass_soler": (
        "Antes de despedirnos 🛡️, ¿cómo le pareció nuestra atención? "
        "Cualquier comentario nos ayuda a mejorar.\n\n"
        "Califíquenos del 1 al 5:\n"
        "5 = Excelente | 4 = Muy buena | 3 = Regular | 2 = Mala | 1 = Pésima"
    ),
    "esmeraldas_soler": (
        "Antes de despedirnos 💎, ¿qué le pareció la atención de Esmeraldas SOLER? "
        "Su opinion nos ayuda a brillar mejor.\n\n"
        "Califíquenos del 1 al 5:\n"
        "5 = Excelente | 4 = Muy buena | 3 = Regular | 2 = Mala | 1 = Pésima"
    ),
    "autos_soler": (
        "Antes de cerrar 🚗, ¿cómo fue tu experiencia con Autos Soler? "
        "Tu opinion nos ayuda a manejarnos mejor.\n\n"
        "Califica del 1 al 5:\n"
        "5 = Excelente | 4 = Muy bueno | 3 = Regular | 2 = Malo | 1 = Pesimo"
    ),
    "inversiones_soler": (
        "Antes de cerrar 🏘️, ¿cómo le pareció nuestra asesoría? "
        "Su opinion nos ayuda a invertir en mejorar.\n\n"
        "Califíquenos del 1 al 5:\n"
        "5 = Excelente | 4 = Muy buena | 3 = Regular | 2 = Mala | 1 = Pésima"
    ),
}


# Frases de cierre del cliente (trigger CSAT)
CLOSING_PATTERNS = [
    r'\b(?:gracias por todo|muchas gracias|perfecto.*listo|ya quedo|todo claro|listo entonces|ya tengo todo|nos vemos|hasta luego|chao|adios)',
    r'\b(?:me cierra|me convence|firmamos|adelante|procedamos)',
    r'\b(?:no quiero comprar|no me interesa|no es lo que buscaba|prefiero otra cosa)\b',
]

# Sentiment patterns
POSITIVE_PATTERNS = [
    r'\b(?:excelente|perfecto|increible|amazing|wow|genial|me encanta|me encanto|fantastico|maravilloso|sorprendido)\b',
    r'\b(?:rapido|profesional|amable|atento|claro|preciso|eficiente)\b',
]
NEGATIVE_PATTERNS = [
    r'\b(?:malo|terrible|pesimo|horrible|decepcionado|no me sirve|perdida de tiempo|no funciona)\b',
    r'\b(?:lento|grosero|impreciso|confuso|complicado|caro|inutil)\b',
]


def _load_csat() -> dict:
    if not CSAT_FILE.exists():
        return {}
    try:
        return json.loads(CSAT_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {}


def _save_csat(data: dict) -> None:
    CSAT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def should_request_csat(user_id: str, business: str, message: str = "") -> bool:
    """
    Decide si pedir CSAT en este momento.
    Returns True si el mensaje del usuario sugiere fin de conversacion.
    """
    if not message:
        return False

    msg_low = message.lower()
    for pattern in CLOSING_PATTERNS:
        if re.search(pattern, msg_low, re.IGNORECASE):
            # Solo pedir una vez por usuario
            with _lock:
                csat = _load_csat()
                key = f"{business}:{user_id}"
                existing = csat.get(key, {})
                if existing.get("requested_at"):
                    return False
            return True
    return False


def request_csat(user_id: str, business: str) -> str:
    """
    Marca que se solicito CSAT a este usuario y retorna el mensaje a enviar.
    Returns el mensaje (string) o "" si ya fue solicitado antes.
    """
    msg = CSAT_REQUEST_MESSAGES.get(business)
    if not msg:
        return ""

    with _lock:
        csat = _load_csat()
        key = f"{business}:{user_id}"
        existing = csat.get(key, {})
        if existing.get("requested_at"):
            return ""  # Ya fue solicitado

        csat[key] = {
            **existing,
            "business": business,
            "user_id": user_id,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }
        _save_csat(csat)

    return msg


def parse_rating_from_message(message: str) -> tuple:
    """
    Extrae rating 1-5 de un mensaje del usuario.
    Returns (rating, comment) o (None, message).
    """
    if not message:
        return None, ""

    # Patrones explicitos: "5", "5/5", "califico 5", "le doy un 4"
    m = re.search(r'\b([1-5])(?:\s*/\s*5)?\b', message)
    if m:
        rating = int(m.group(1))
        # Extraer comentario (todo despues del numero)
        rest = re.sub(r'\b[1-5](?:\s*/\s*5)?\b', '', message).strip()
        return rating, rest

    # Palabras: "excelente"=5, "muy buena/bueno"=4, etc.
    word_ratings = {
        "excelente": 5, "perfecto": 5, "increible": 5,
        "muy buen": 4, "muy buen": 4, "muy bueno": 4, "muy buena": 4,
        "buen": 3, "bueno": 3, "buena": 3, "regular": 3,
        "mal": 2, "malo": 2, "mala": 2,
        "terrible": 1, "pesimo": 1, "pesima": 1, "horrible": 1,
    }
    msg_low = message.lower()
    for word, rating in word_ratings.items():
        if word in msg_low:
            return rating, message

    return None, message


def record_rating(user_id: str, business: str, rating: int, comment: str = "") -> dict:
    """Registra un rating recibido. Retorna el record completo."""
    if rating not in range(1, 6):
        return {"error": "Rating fuera de rango 1-5"}

    with _lock:
        csat = _load_csat()
        key = f"{business}:{user_id}"
        existing = csat.get(key, {})

        existing.update({
            "business": business,
            "user_id": user_id,
            "rating": rating,
            "comment": comment,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        })
        csat[key] = existing
        _save_csat(csat)

    return existing


def infer_sentiment(messages: list) -> dict:
    """
    Infiere sentiment de los mensajes de un usuario.
    Returns {sentiment: positive/neutral/negative, confidence: 0-1, signals: [...]}.
    """
    if not messages:
        return {"sentiment": "neutral", "confidence": 0, "signals": []}

    positive_count = 0
    negative_count = 0
    signals = []

    for msg in messages:
        text = msg.get("content", "") if isinstance(msg, dict) else str(msg)
        msg_low = text.lower()

        for pattern in POSITIVE_PATTERNS:
            for m in re.finditer(pattern, msg_low, re.IGNORECASE):
                positive_count += 1
                signals.append(("pos", m.group(0)))

        for pattern in NEGATIVE_PATTERNS:
            for m in re.finditer(pattern, msg_low, re.IGNORECASE):
                negative_count += 1
                signals.append(("neg", m.group(0)))

    total = positive_count + negative_count
    if total == 0:
        return {"sentiment": "neutral", "confidence": 0.5, "signals": []}

    pos_ratio = positive_count / total
    if pos_ratio >= 0.7:
        sentiment = "positive"
    elif pos_ratio <= 0.3:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    confidence = max(positive_count, negative_count) / max(len(messages), 1)
    confidence = min(1.0, confidence)

    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 2),
        "positive_signals": positive_count,
        "negative_signals": negative_count,
        "signals_detected": signals[:10],
    }


def get_csat(user_id: str, business: str) -> dict:
    with _lock:
        csat = _load_csat()
        return csat.get(f"{business}:{user_id}", {})


def list_ratings(business: str = None, min_rating: int = None) -> list:
    with _lock:
        csat = _load_csat()
        results = []
        for v in csat.values():
            if business and v.get("business") != business:
                continue
            if min_rating is not None and (v.get("rating") or 0) < min_rating:
                continue
            results.append(v)
        return sorted(results, key=lambda x: x.get("recorded_at", ""), reverse=True)


def aggregate_stats(business: str = None) -> dict:
    """Returns aggregate CSAT stats."""
    ratings = [r.get("rating") for r in list_ratings(business) if r.get("rating")]
    if not ratings:
        return {"total_ratings": 0, "avg_rating": 0, "csat_score": 0, "by_rating": {}}

    avg = sum(ratings) / len(ratings)
    # CSAT score = % de ratings 4 o 5
    promoters = sum(1 for r in ratings if r >= 4)
    csat_score = (promoters / len(ratings)) * 100

    by_rating = {i: ratings.count(i) for i in range(1, 6)}

    return {
        "business": business,
        "total_ratings": len(ratings),
        "avg_rating": round(avg, 2),
        "csat_score": round(csat_score, 1),
        "by_rating": by_rating,
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    print("=== Self-test csat_tracker ===\n")

    # Simulate conversation closing
    closing_msg = "Perfecto, listo entonces. Muchas gracias por todo!"
    should = should_request_csat("user_demo", "glass_soler", closing_msg)
    print(f"Should request CSAT for closing message: {should}")

    if should:
        msg = request_csat("user_demo", "glass_soler")
        print(f"\nBot enviaria:\n{msg}\n")

    # Parse rating
    rating, comment = parse_rating_from_message("5/5 excelente atencion")
    print(f"Parse '5/5 excelente atencion': rating={rating}, comment='{comment}'")

    rating, comment = parse_rating_from_message("Muy buena atencion")
    print(f"Parse 'Muy buena atencion': rating={rating}, comment='{comment}'")

    # Record rating
    record = record_rating("user_demo", "glass_soler", 5, "Excelente atencion, recomendado!")
    print(f"\nRating registrado: {record}")

    # Infer sentiment
    messages = [
        {"content": "Excelente servicio, muy rapido"},
        {"content": "Profesional y atento"},
        {"content": "Me encanto el trato"},
    ]
    sentiment = infer_sentiment(messages)
    print(f"\nSentiment de 3 mensajes positivos: {sentiment}")

    # Stats
    stats = aggregate_stats("glass_soler")
    print(f"\nStats Glass Soler: {stats}")
