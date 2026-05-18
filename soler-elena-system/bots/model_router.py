"""
Model Router — Decide entre Haiku (cheap) y Sonnet (smart) por complejidad del mensaje.

Ahorro de costos esperado: ~3x en costo total con 0% degradacion percibida.

Heuristicas:
- HAIKU 4.5: greetings, confirmaciones simples, primer turno con "hola/info/precio"
- SONNET 4.5: precio especifico, comparaciones, objeciones, conversaciones >5 turnos

Uso:
    from model_router import route_model

    model = route_model(
        user_message="Hola",
        conversation_turns=0,
        business="glass_soler"
    )
    # Returns: "claude-haiku-4-5-20250101"

Configuracion env (con defaults):
    MODEL_ROUTER_ENABLED=true
    MODEL_HAIKU=claude-haiku-4-5-20250101
    MODEL_SONNET=claude-sonnet-4-5-20250929
"""
import os
import re
from pathlib import Path

# Load defaults
ENV_PATHS = [
    Path(__file__).parent / ".env",
    Path("C:/Users/Usuario/Desktop/Bot glass soler/.env"),
]

ENV_VARS = {}
for p in ENV_PATHS:
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                ENV_VARS[k.strip()] = v.strip()
        break

ENABLED = ENV_VARS.get("MODEL_ROUTER_ENABLED", "true").lower() in ("true", "1", "yes")
MODEL_HAIKU = ENV_VARS.get("MODEL_HAIKU", "claude-haiku-4-5-20251001")
MODEL_SONNET = ENV_VARS.get("MODEL_SONNET", "claude-sonnet-4-5-20250929")

# Patrones que fuerzan Sonnet (mensaje complejo / objecion / detalle)
SONNET_PATTERNS = [
    # Objeciones / precio / comparacion
    r'\b(?:caro|barato|otro lugar|otra empresa|comparado|comparando|mejor precio|descuento)\b',
    # Multi-pregunta
    r'\?.*\?',  # dos signos de pregunta
    # Detalle tecnico
    r'\b(?:micras|garantia|UV|seguridad|tecnologia|especifica|especificaciones)\b',
    # Negacion/duda fuerte
    r'\b(?:no estoy seguro|no me convence|pienso que|considero|tengo dudas)\b',
    # Decisiones financieras
    r'\b(?:financiamiento|prestamo|tasa|cuota|inversion|roi|rentabilidad)\b',
    # Custom/personalizado
    r'\b(?:hecho a la medida|personalizar|disenar|custom|especial)\b',
]

# Patrones que fuerzan Haiku (saludo/confirm/simple)
HAIKU_PATTERNS = [
    r'^(?:hola|buenas|buen dia|hey|saludos)$',
    r'^(?:si|no|ok|listo|dale|claro|gracias|ya)\b',
    r'^(?:precio|info|cotizar|cotizacion|cuanto)$',
    r'^[\w]{1,15}$',  # Single word/short
]


def route_model(user_message: str, conversation_turns: int = 0, business: str = "unknown") -> dict:
    """
    Decide modelo a usar. Returns dict con:
        model: nombre del modelo
        reason: por que se eligio
        is_haiku: bool
    """
    if not ENABLED:
        return {"model": MODEL_SONNET, "reason": "router_disabled", "is_haiku": False}

    msg = (user_message or "").strip().lower()
    msg_len = len(msg)

    # 1. Forzar Sonnet si conversacion ya es larga (likely complex)
    if conversation_turns >= 6:
        return {"model": MODEL_SONNET, "reason": "conversation_long", "is_haiku": False}

    # 2. Patrones de Sonnet
    for pattern in SONNET_PATTERNS:
        if re.search(pattern, msg, re.IGNORECASE):
            return {"model": MODEL_SONNET, "reason": f"sonnet_pattern:{pattern[:30]}", "is_haiku": False}

    # 3. Patrones de Haiku
    for pattern in HAIKU_PATTERNS:
        if re.search(pattern, msg, re.IGNORECASE):
            return {"model": MODEL_HAIKU, "reason": f"haiku_pattern:{pattern[:30]}", "is_haiku": True}

    # 4. Por longitud
    if msg_len < 25 and conversation_turns < 3:
        return {"model": MODEL_HAIKU, "reason": "short_message_early_conv", "is_haiku": True}

    # 5. Default Sonnet para todo lo demas
    return {"model": MODEL_SONNET, "reason": "default_sonnet", "is_haiku": False}


def estimate_cost_savings(messages_log: list) -> dict:
    """Estima ahorro si se usa el router vs sonnet siempre."""
    # Pricing estimado (USD por 1M tokens)
    sonnet_input = 3.00
    sonnet_output = 15.00
    haiku_input = 1.00
    haiku_output = 5.00

    total_sonnet_cost = 0
    total_router_cost = 0

    for msg in messages_log:
        # Estimacion: 200 input tokens, 300 output tokens promedio
        input_tokens = msg.get("input_tokens", 200)
        output_tokens = msg.get("output_tokens", 300)

        sonnet_cost = (input_tokens / 1e6 * sonnet_input) + (output_tokens / 1e6 * sonnet_output)
        total_sonnet_cost += sonnet_cost

        route = route_model(
            msg.get("user_message", ""),
            msg.get("conversation_turns", 0),
            msg.get("business", "unknown")
        )

        if route["is_haiku"]:
            router_cost = (input_tokens / 1e6 * haiku_input) + (output_tokens / 1e6 * haiku_output)
        else:
            router_cost = sonnet_cost
        total_router_cost += router_cost

    savings = total_sonnet_cost - total_router_cost
    savings_pct = (savings / total_sonnet_cost * 100) if total_sonnet_cost > 0 else 0

    return {
        "messages": len(messages_log),
        "total_sonnet_only_usd": round(total_sonnet_cost, 4),
        "total_router_usd": round(total_router_cost, 4),
        "savings_usd": round(savings, 4),
        "savings_pct": round(savings_pct, 1),
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    print("=== Self-test model_router ===\n")
    print(f"Router enabled: {ENABLED}")
    print(f"HAIKU: {MODEL_HAIKU}")
    print(f"SONNET: {MODEL_SONNET}\n")

    test_cases = [
        ("Hola", 0, "Saludo simple"),
        ("hola", 0, "Saludo lowercase"),
        ("Si", 1, "Confirmacion"),
        ("Cuanto cuesta el paquete Premium para mi Toyota Corolla 2018?", 1, "Pregunta detallada"),
        ("Está muy caro, en otro taller me cobran 200 mil", 3, "Objecion precio"),
        ("Cuál es la diferencia entre Premium y Total Security?", 2, "Pregunta comparacion"),
        ("Necesito financiamiento bancario, qué opciones tienen?", 3, "Pregunta financiamiento"),
        ("ok", 2, "Single word confirm"),
        ("precio", 0, "Single word precio"),
        ("Gracias!", 5, "Despedida"),
        ("Quiero ver más detalles del paquete con 27000 micras y la garantia", 4, "Detalle tecnico"),
    ]

    for msg, turns, desc in test_cases:
        result = route_model(msg, turns, "glass_soler")
        icon = "💸" if result["is_haiku"] else "💎"
        print(f"{icon} [{result['model'].split('-')[1].upper()}] turns={turns} \"{msg[:50]}\" | {desc}")
        print(f"    razon: {result['reason']}\n")

    # Estimar ahorro hipotetico
    print("\n=== Estimacion ahorro ===")
    sample_log = [{"user_message": m, "conversation_turns": t, "business": "glass"} for m, t, _ in test_cases]
    savings = estimate_cost_savings(sample_log)
    print(f"Mensajes: {savings['messages']}")
    print(f"Costo SOLO Sonnet: ${savings['total_sonnet_only_usd']}")
    print(f"Costo con Router: ${savings['total_router_usd']}")
    print(f"Ahorro: ${savings['savings_usd']} ({savings['savings_pct']}%)")
