"""
Auto-followup — Recupera hot leads que no respondieron en X horas.

Cada hora detecta hot leads inactivos y envia mensaje de followup desde Elena.
Maximo 2 followups por lead, despues marca como "perdido por silencio".

Uso:
    python auto_followup.py              # ejecuta 1 vez (dry-run)
    python auto_followup.py --send       # ejecuta y envia followups reales
    python auto_followup.py --daemon     # corre cada hora indefinidamente

Configuracion (con defaults razonables):
    FOLLOWUP_HOURS_INACTIVE=4
    FOLLOWUP_MAX_ATTEMPTS=2
    FOLLOWUP_SECOND_DELAY_HOURS=24
"""
import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

ROOT = Path(__file__).parent

# Load .env
ENV_VARS = {}
for env_path in [ROOT / ".env", Path("C:/Users/Usuario/Desktop/Bot glass soler/.env")]:
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                ENV_VARS[k.strip()] = v.strip()
        break

HOURS_INACTIVE = int(ENV_VARS.get("FOLLOWUP_HOURS_INACTIVE", "4"))
MAX_ATTEMPTS = int(ENV_VARS.get("FOLLOWUP_MAX_ATTEMPTS", "2"))
SECOND_DELAY_HOURS = int(ENV_VARS.get("FOLLOWUP_SECOND_DELAY_HOURS", "24"))

META_TOKEN = ENV_VARS.get("META_ACCESS_TOKEN", "")
META_API = ENV_VARS.get("META_API_VERSION", "v25.0")

# Tracking de followups enviados (idempotente)
FOLLOWUP_STATE = ROOT / "data" / "followup_state.json"
FOLLOWUP_STATE.parent.mkdir(exist_ok=True)


def load_state() -> dict:
    if not FOLLOWUP_STATE.exists():
        return {}
    try:
        return json.loads(FOLLOWUP_STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(state: dict) -> None:
    FOLLOWUP_STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


# Mensajes de followup por business + numero de intento
FOLLOWUP_MESSAGES = {
    "glass_soler": {
        1: "Hola! 🛡️ Soy Elena de Glass Soler. Hace un rato me consultaba sobre polarizado de seguridad — sigue interesado? Me cuenta y le ayudo con el paquete que mejor se acomode.",
        2: "Hola de nuevo 🛡️ Si todavía está pensando el tema del polarizado, le recuerdo: 100% importado USA, garantía, instalación profesional. Si decidió otra cosa o ya no le interesa, nos avisa para no molestarlo. Gracias!"
    },
    "esmeraldas_soler": {
        1: "Hola! 💎 Soy Elena de Esmeraldas SOLER. Vi que estábamos viendo opciones — sigue interesada en alguna pieza? Si quiere le mando más fotos o le hago una sugerencia personalizada.",
        2: "Hola otra vez 💎 Sigo a la orden si decide retomar la conversación. Tenemos piezas nuevas que recién llegaron que tal vez le encanten. Le mando una?"
    },
    "autos_soler": {
        1: "Hola! 🚗 Soy Elena de Autos Soler. Estaba viendo opciones de vehículos hace un rato — sigue buscando? Tengo unidades nuevas que entraron esta semana que puede interesarle.",
        2: "Hola otra vez! 🚗 Si todavía está la búsqueda activa, recuerde que tenemos financiamiento bancario, recibimos su auto en parte de pago, y todos vienen con garantía mecánica. Le ayudo con algo?"
    },
    "inversiones_soler": {
        1: "Hola! 🏘️ Soy Elena de Inversiones Soler. Estábamos analizando opciones de inversión inmobiliaria — sigue interesado en explorar el mercado? Tengo info de zonas y ROIs actualizados que le puedo compartir.",
        2: "Hola de vuelta! 🏘️ Si todavía está en planes, le recuerdo que la consulta inicial es gratuita (30 min). Le ayudo a entender opciones sin compromiso. Cuando quiera retomamos."
    }
}


def find_inactive_hot_leads() -> list:
    """Combine conversation_store + lead_scoring para encontrar hot leads inactivos."""
    try:
        import conversation_store
        return conversation_store.find_inactive_hot_leads(hours_inactive=HOURS_INACTIVE)
    except ImportError as e:
        print(f"[X] No pude importar conversation_store: {e}")
        return []


def send_meta_message(business: str, user_id: str, message: str, dry_run: bool = True) -> dict:
    """Envia mensaje via Meta Send API. Si dry_run, solo loguea."""
    if dry_run:
        print(f"  [DRY-RUN] Enviaria a {business}/{user_id}:")
        print(f"           {message[:120]}")
        return {"dry_run": True, "ok": True}

    if not META_TOKEN or META_TOKEN.startswith("EAA..."):
        print(f"  [X] META_ACCESS_TOKEN no configurado")
        return {"ok": False, "error": "no_token"}

    url = f"https://graph.facebook.com/{META_API}/me/messages?access_token={META_TOKEN}"
    payload = {
        "recipient": {"id": user_id},
        "message": {"text": message},
        "messaging_type": "RESPONSE",  # Within 24h messaging window
    }
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        r = urllib.request.urlopen(req, timeout=10)
        body = json.loads(r.read())
        print(f"  [OK] Enviado a {user_id}: {body.get('message_id', '?')}")
        return {"ok": True, "response": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [X] Meta error HTTP {e.code}: {body[:120]}")
        return {"ok": False, "error": body[:200]}


def notify_followup(business: str, user_id: str, attempt: int) -> None:
    """Notifica via notifications.py si está disponible."""
    try:
        import notifications
        notifications.notify_event(
            "info",
            f"Followup #{attempt} enviado a {business}/{user_id}",
            {"business": business, "user_id": user_id, "attempt": attempt}
        )
    except ImportError:
        pass


def process_followups(send: bool = False) -> dict:
    """Encuentra y procesa hot leads inactivos."""
    print(f"\n[Auto-followup] Buscando hot leads inactivos > {HOURS_INACTIVE}h...")

    inactive = find_inactive_hot_leads()
    print(f"[Auto-followup] Encontrados {len(inactive)} hot leads inactivos\n")

    if not inactive:
        return {"processed": 0, "sent": 0, "skipped": 0}

    state = load_state()
    sent_count = 0
    skipped = 0

    for lead in inactive:
        key = f"{lead['business']}:{lead['user_id']}"
        followup_history = state.get(key, {"attempts": 0, "last_followup": None})

        # Check max attempts
        if followup_history["attempts"] >= MAX_ATTEMPTS:
            print(f"[skip] {key} ya alcanzo {MAX_ATTEMPTS} followups — marcado como silencioso")
            skipped += 1
            continue

        # Check delay between followups
        if followup_history["last_followup"]:
            last_dt = datetime.fromisoformat(followup_history["last_followup"].replace("Z", "+00:00"))
            hours_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            min_delay = SECOND_DELAY_HOURS if followup_history["attempts"] >= 1 else HOURS_INACTIVE
            if hours_since < min_delay:
                print(f"[skip] {key} ultimo followup hace {hours_since:.1f}h (min {min_delay}h)")
                skipped += 1
                continue

        # Send followup
        attempt = followup_history["attempts"] + 1
        message = FOLLOWUP_MESSAGES.get(lead["business"], {}).get(attempt)
        if not message:
            print(f"[skip] {key} no hay mensaje para attempt {attempt}")
            skipped += 1
            continue

        print(f"[Followup #{attempt}] {key} (score {lead['score']}, ultimo msg {lead['last_message_at']})")
        result = send_meta_message(lead["business"], lead["user_id"], message, dry_run=not send)

        if result.get("ok"):
            sent_count += 1
            # Update state
            state[key] = {
                "attempts": attempt,
                "last_followup": datetime.now(timezone.utc).isoformat(),
                "business": lead["business"],
                "user_id": lead["user_id"],
                "last_message_at": lead["last_message_at"],
                "score_at_followup": lead.get("score", 0),
            }
            save_state(state)
            if send:
                notify_followup(lead["business"], lead["user_id"], attempt)

    return {"processed": len(inactive), "sent": sent_count, "skipped": skipped}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--send", action="store_true", help="Enviar followups reales (sin --send es dry-run)")
    ap.add_argument("--daemon", action="store_true", help="Correr cada hora indefinidamente")
    args = ap.parse_args()

    print(f"[Auto-followup] Config:")
    print(f"  HOURS_INACTIVE={HOURS_INACTIVE}h, MAX_ATTEMPTS={MAX_ATTEMPTS}, SECOND_DELAY={SECOND_DELAY_HOURS}h")
    print(f"  Modo: {'DEMON (cada hora)' if args.daemon else 'one-shot'} {'+ SEND REAL' if args.send else '(DRY-RUN)'}")

    if args.daemon:
        while True:
            stats = process_followups(send=args.send)
            print(f"\n[summary] processed={stats['processed']} sent={stats['sent']} skipped={stats['skipped']}")
            print(f"[sleep] Esperando 1 hora hasta proximo check...\n")
            time.sleep(3600)
    else:
        stats = process_followups(send=args.send)
        print(f"\n[summary] processed={stats['processed']} sent={stats['sent']} skipped={stats['skipped']}")


if __name__ == "__main__":
    main()
