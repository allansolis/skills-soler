"""
Notifications — modulo de alertas para eventos importantes del sistema.

Soporta:
- Slack webhook (env SLACK_WEBHOOK_URL)
- Telegram bot (env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
- Console log (siempre activo)
- Archivo data/notifications.log (siempre activo)

Uso:
    from notifications import notify_hot_lead, notify_handoff, notify_event

    notify_hot_lead(business='glass_soler', user_id='abc', score=85, last_message='...')
    notify_handoff(business='inversiones_soler', user_id='xyz', signals=['name_provided','asking_price'])
    notify_event(level='info', message='Bot Glass restarted')

Configurar en .env:
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
    TELEGRAM_BOT_TOKEN=1234567:ABC...
    TELEGRAM_CHAT_ID=987654321
"""
import os
import json
import logging
import threading
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# Norton AV bypass
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
LOG_FILE = DATA_DIR / "notifications.log"

_lock = threading.Lock()

logger = logging.getLogger("notifications")
if not logger.handlers:
    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(fh)
    logger.setLevel(logging.INFO)


def _load_env_var(key: str) -> str:
    """Lee env var, con fallback a leer .env directamente."""
    v = os.environ.get(key, "")
    if v:
        return v
    env_paths = [
        Path(__file__).parent / ".env",
        Path("C:/Users/Usuario/Desktop/Bot glass soler/.env"),
    ]
    for p in env_paths:
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                if line.startswith(f"{key}=") and not line.startswith("#"):
                    return line.split("=", 1)[1].strip()
    return ""


def _send_slack(text: str, attachments: list = None) -> bool:
    """POST mensaje a Slack webhook."""
    url = _load_env_var("SLACK_WEBHOOK_URL")
    if not url:
        return False
    payload = {"text": text}
    if attachments:
        payload["attachments"] = attachments
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=8)
        return True
    except Exception as e:
        logger.warning(f"Slack notify fallo: {e}")
        return False


def _send_telegram(text: str) -> bool:
    """Send a Telegram message."""
    token = _load_env_var("TELEGRAM_BOT_TOKEN")
    chat_id = _load_env_var("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        data = urllib.parse.urlencode(payload).encode()
        urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=8)
        return True
    except Exception as e:
        logger.warning(f"Telegram notify fallo: {e}")
        return False


def _print_console(level: str, text: str) -> None:
    """Print to stdout with level prefix."""
    icon = {"info": "[i]", "warn": "[!]", "alert": "[!!]", "error": "[X]"}.get(level, "[?]")
    print(f"{icon} NOTIFY {level.upper()}: {text}", flush=True)


def notify_event(level: str, message: str, metadata: dict = None) -> dict:
    """Send a generic notification across all configured channels."""
    timestamp = datetime.now(timezone.utc).isoformat()
    full_text = f"[{timestamp}] [{level.upper()}] {message}"

    if metadata:
        full_text += f"\nMetadata: {json.dumps(metadata, ensure_ascii=False)}"

    results = {"timestamp": timestamp, "level": level, "channels": {}}

    with _lock:
        # Always log
        logger.log(
            {"info": logging.INFO, "warn": logging.WARNING, "alert": logging.WARNING, "error": logging.ERROR}.get(level, logging.INFO),
            f"{message} | {json.dumps(metadata or {}, ensure_ascii=False)}"
        )
        results["channels"]["log"] = True

        # Console always
        _print_console(level, message)
        results["channels"]["console"] = True

        # Slack opcional
        if level in ("alert", "warn", "error"):
            results["channels"]["slack"] = _send_slack(full_text)
            results["channels"]["telegram"] = _send_telegram(full_text)

    return results


def notify_hot_lead(business: str, user_id: str, score: int, last_message: str = "", signals: list = None) -> dict:
    """Specialized notification when a hot lead is detected."""
    signals = signals or []
    text = (
        f"🔥 *HOT LEAD detectado*\n"
        f"• Negocio: {business}\n"
        f"• User: `{user_id}`\n"
        f"• Score: *{score}*\n"
        f"• Señales: {', '.join(signals)}\n"
        f"• Último mensaje: _{last_message[:120]}_"
    )
    return notify_event(
        "alert",
        f"Hot lead {business}/{user_id} score={score}",
        {"business": business, "user_id": user_id, "score": score, "signals": signals, "message_preview": last_message[:120]}
    )


def notify_handoff(business: str, user_id: str, signals: list = None, last_message: str = "") -> dict:
    """Notification when handoff to human is triggered."""
    signals = signals or []
    text = (
        f"⚡ *HANDOFF a humano requerido*\n"
        f"• Negocio: {business}\n"
        f"• User: `{user_id}`\n"
        f"• Señales: {', '.join(signals)}\n"
        f"• Mensaje: _{last_message[:120]}_"
    )
    return notify_event(
        "alert",
        f"Handoff {business}/{user_id}",
        {"business": business, "user_id": user_id, "signals": signals, "message_preview": last_message[:120]}
    )


def notify_bot_event(bot_name: str, event: str, level: str = "info") -> dict:
    """Notification for bot lifecycle events (start, stop, error)."""
    return notify_event(level, f"Bot {bot_name}: {event}", {"bot": bot_name, "event": event})


def get_recent_notifications(limit: int = 50) -> list:
    """Read recent notifications from log file."""
    if not LOG_FILE.exists():
        return []
    try:
        lines = LOG_FILE.read_text(encoding="utf-8").strip().split("\n")
        return lines[-limit:]
    except Exception:
        return []


if __name__ == "__main__":
    # Self-test
    print("=== Self-test notifications ===\n")
    notify_event("info", "Modulo notifications cargado correctamente")
    notify_hot_lead(
        business="glass_soler",
        user_id="test_xyz",
        score=85,
        last_message="Hola me llamo Pedro quiero el paquete Premium",
        signals=["name_provided", "asking_price", "specific_product_glass"]
    )
    notify_handoff(
        business="inversiones_soler",
        user_id="abc",
        signals=["explicit_handoff"],
        last_message="Quiero hablar con un asesor humano"
    )
    notify_bot_event("bot_glass", "restarted", "info")
    print(f"\nLog file: {LOG_FILE}")
    print(f"Recent notifications:\n")
    for line in get_recent_notifications(10):
        print(f"  {line}")
