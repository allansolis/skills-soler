"""
A/B Testing — Framework para experimentos en mensajes de Elena.

Soporta:
- Variantes A/B/C... por experimento
- Asignacion sticky por user_id (mismo user siempre ve la misma variante)
- Tracking de conversion events (mensaje recibido, hot lead, handoff, etc.)
- Stats con confidence interval

Uso:
    from ab_testing import assign_variant, track_event, get_results

    # En el bot, decidir variante para el primer saludo
    variant = assign_variant(experiment="greeting_v1", user_id="abc", business="glass_soler")
    if variant == "A":
        respuesta = "Hola, soy Elena de Glass Soler 🛡️ ¿Con quién tengo el gusto?"
    else:
        respuesta = "Hola! Que bueno verte por aca. Soy Elena 🛡️ ¿Como te llamas?"

    # Trackear eventos
    track_event(experiment="greeting_v1", user_id="abc", event="message_replied")
    track_event(experiment="greeting_v1", user_id="abc", event="hot_lead")
    track_event(experiment="greeting_v1", user_id="abc", event="handoff")

    # Ver resultados
    results = get_results("greeting_v1")
"""
import os
import json
import hashlib
import threading
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
STATE_FILE = DATA_DIR / "ab_tests.json"

_lock = threading.Lock()


# Configuracion de experimentos activos
EXPERIMENTS = {
    "greeting_v1": {
        "description": "Saludo inicial: formal usted vs casual tu",
        "variants": ["A", "B"],
        "weights": [50, 50],  # 50/50 split
        "active": True,
    },
    "price_question_response": {
        "description": "Respuesta a 'cuanto cuesta': directo vs consultivo",
        "variants": ["A", "B"],
        "weights": [50, 50],
        "active": True,
    },
    "handoff_message": {
        "description": "Mensaje cuando se detecta handoff",
        "variants": ["A", "B"],
        "weights": [50, 50],
        "active": False,  # Disabled por defecto
    },
}


def _load_state() -> dict:
    if not STATE_FILE.exists():
        return {"assignments": {}, "events": []}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"assignments": {}, "events": []}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def assign_variant(experiment: str, user_id: str, business: str = "unknown") -> str:
    """
    Asigna una variante al user. Sticky: mismo user_id siempre obtiene la misma.
    Returns la variante asignada (ej. "A", "B"). Returns "A" si el experimento no existe o esta inactivo.
    """
    exp = EXPERIMENTS.get(experiment)
    if not exp or not exp.get("active"):
        return "A"  # Default (no testing)

    key = f"{experiment}:{business}:{user_id}"

    with _lock:
        state = _load_state()

        # Sticky: si ya asignado, return cached
        if key in state["assignments"]:
            return state["assignments"][key]["variant"]

        # Asignar via hash (deterministico)
        h = int(hashlib.sha256(key.encode()).hexdigest()[:8], 16)
        weights = exp["weights"]
        total = sum(weights)
        target = h % total

        cum = 0
        chosen = exp["variants"][0]
        for variant, weight in zip(exp["variants"], weights):
            cum += weight
            if target < cum:
                chosen = variant
                break

        state["assignments"][key] = {
            "variant": chosen,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "business": business,
            "user_id": user_id,
        }
        _save_state(state)

    return chosen


def track_event(experiment: str, user_id: str, event: str, business: str = "unknown", metadata: dict = None) -> None:
    """Registra un evento de conversion para el experimento+user."""
    if experiment not in EXPERIMENTS:
        return

    with _lock:
        state = _load_state()
        key = f"{experiment}:{business}:{user_id}"
        variant = state["assignments"].get(key, {}).get("variant")

        if not variant:
            return  # User no esta en el experimento

        state["events"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "experiment": experiment,
            "user_id": user_id,
            "business": business,
            "variant": variant,
            "event": event,
            "metadata": metadata or {},
        })
        # Keep solo ultimos 5000 events
        state["events"] = state["events"][-5000:]
        _save_state(state)


def get_results(experiment: str, business: str = None) -> dict:
    """Returns aggregate stats para el experimento."""
    with _lock:
        state = _load_state()

    exp = EXPERIMENTS.get(experiment)
    if not exp:
        return {"error": "Experimento no existe"}

    # Filtrar events de este experimento
    events = [e for e in state["events"] if e["experiment"] == experiment]
    if business:
        events = [e for e in events if e["business"] == business]

    # Count assignments por variante
    assignments_by_variant = defaultdict(int)
    for key, info in state["assignments"].items():
        if key.startswith(f"{experiment}:") and (not business or info.get("business") == business):
            assignments_by_variant[info["variant"]] += 1

    # Count events por variante x event type
    events_by_variant = defaultdict(lambda: defaultdict(int))
    for e in events:
        events_by_variant[e["variant"]][e["event"]] += 1

    # Build summary
    summary = {
        "experiment": experiment,
        "description": exp["description"],
        "active": exp.get("active", False),
        "business_filter": business,
        "variants": {},
    }

    for variant in exp["variants"]:
        assigned = assignments_by_variant.get(variant, 0)
        events_count = dict(events_by_variant.get(variant, {}))
        total_conversions = events_count.get("hot_lead", 0) + events_count.get("handoff", 0)

        summary["variants"][variant] = {
            "users_assigned": assigned,
            "events": events_count,
            "conversion_rate_pct": round((total_conversions / assigned * 100), 2) if assigned > 0 else 0,
        }

    # Determinar ganador (basico)
    rates = {v: summary["variants"][v]["conversion_rate_pct"] for v in exp["variants"]}
    if any(r > 0 for r in rates.values()):
        winner = max(rates, key=rates.get)
        summary["winner_so_far"] = winner
        summary["winner_rate"] = rates[winner]
    else:
        summary["winner_so_far"] = None

    return summary


def get_all_results() -> dict:
    """Returns results de todos los experimentos."""
    return {exp: get_results(exp) for exp in EXPERIMENTS}


# Pre-defined messages for variants (los bots pueden importar)

GREETING_VARIANTS = {
    "glass_soler": {
        "A": "Hola, soy Elena de Glass Soler 🛡️ ¿Con quién tengo el gusto?",  # formal usted
        "B": "Hola! 🛡️ Soy Elena de Glass Soler. Antes de empezar, ¿cómo te llamas?",  # casual tu
    },
    "esmeraldas_soler": {
        "A": "Hola, soy Elena de Esmeraldas SOLER 💎 ¿Con quién tengo el gusto?",
        "B": "Hola! 💎 Que bueno verte por aca. Soy Elena. ¿Como te llamas?",
    },
    "autos_soler": {
        "A": "Hola, soy Elena de Autos Soler 🚗 ¿Con quién tengo el gusto?",
        "B": "Hola! 🚗 Soy Elena de Autos Soler. Buscando algun vehiculo en particular?",
    },
    "inversiones_soler": {
        "A": "Hola, soy Elena de Inversiones Soler 🏘️ ¿Con quién tengo el gusto?",
        "B": "Hola! 🏘️ Soy Elena. Estas explorando opciones de inversion inmobiliaria?",
    },
}

PRICE_VARIANTS = {
    "A_direct": "El precio depende del vehiculo. Para su {modelo}, los paquetes van desde {min} hasta {max}. ¿Cual le interesa más?",
    "B_consultive": "Buena pregunta — el precio depende de lo que necesite. ¿Es para protección anti-robo, reducir calor, o privacidad? Asi le recomiendo el paquete ideal."
}


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("=== Self-test ab_testing ===\n")

    # Asignar variantes a 20 usuarios random
    users = [f"user_{i}" for i in range(20)]
    for user in users:
        variant = assign_variant("greeting_v1", user, "glass_soler")
        # Simular events random para probar tracking
        track_event("greeting_v1", user, "message_received", "glass_soler")
        if hash(user) % 3 == 0:
            track_event("greeting_v1", user, "hot_lead", "glass_soler")
        if hash(user) % 5 == 0:
            track_event("greeting_v1", user, "handoff", "glass_soler")

    # Ver resultados
    results = get_results("greeting_v1")
    print(f"Experimento: {results['experiment']}")
    print(f"Descripcion: {results['description']}\n")
    for variant, stats in results["variants"].items():
        print(f"  Variante {variant}:")
        print(f"    Usuarios asignados: {stats['users_assigned']}")
        print(f"    Events: {stats['events']}")
        print(f"    Conversion rate: {stats['conversion_rate_pct']}%")
    print(f"\nGanador: {results.get('winner_so_far', 'no data')} ({results.get('winner_rate', 0)}%)")
