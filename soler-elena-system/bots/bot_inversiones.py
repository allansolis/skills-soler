"""
Bot de ventas Elena — Inversiones Soler
KB se carga desde kb_inversiones.json
"""

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

import json
import logging
import os
import re
import secrets
import threading
import uuid
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("elena-inversiones")

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "600"))
MAX_MESSAGE_LENGTH = int(os.getenv("MAX_MESSAGE_LENGTH", "1000"))
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "30"))

app = Flask(__name__)

# Lead scoring + handoff endpoints
try:
    from lead_endpoints import register_lead_endpoints
    register_lead_endpoints(app, business="inversiones_soler")
except Exception as _e:  # noqa: BLE001
    print(f"[warn] lead_endpoints no disponible: {_e}")

_api_key = os.getenv("ANTHROPIC_API_KEY", "")
if not _api_key:
    _env_path = Path(__file__).parent / ".env"
    if _env_path.exists():
        with open(_env_path, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line.startswith("ANTHROPIC_API_KEY=") and not _line.startswith("#"):
                    _api_key = _line.split("=", 1)[1].strip()
                    break
if not _api_key:
    raise RuntimeError("ANTHROPIC_API_KEY no encontrado")
client = Anthropic(api_key=_api_key)

conversaciones: dict[str, list] = {}
_lock = threading.Lock()

KB_PATH = Path(__file__).parent / "kb_inversiones.json"


def cargar_kb() -> dict:
    try:
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Error cargando KB Inversiones: %s", e)
        return {}


KB = cargar_kb()


def construir_system_prompt() -> str:
    if not KB:
        return "KB Inversiones Soler no disponible."

    neg = KB.get("negocio", {})
    ctc = KB.get("contacto", {})
    servicios = KB.get("servicios", [])
    pago = KB.get("formas_pago", {})
    flujo = KB.get("flujo_venta", [])
    objs = KB.get("objeciones", [])
    identidad = KB.get("identidad", {})
    reglas = KB.get("reglas_absolutas", {})
    tipos = KB.get("tipos_inversion", [])

    serv_text = "\n".join(f"- {s['categoria']}: {s.get('descripcion','')}" for s in servicios)
    tipos_text = "\n".join(f"- {t['tipo']}: {t['rango_precio']} | ROI {t['roi_estimado']} ({t['ideal_para']})" for t in tipos)
    pago_text = "\n".join(f"{k.upper().replace('_',' ')} → {v.get('frase','')}" for k, v in pago.items() if isinstance(v, dict))
    flujo_text = "\n".join(f"PASO {p['paso']} — {p['nombre']}: " + (p.get('ejemplo','') or ' / '.join(p.get('ejemplos',[])) or ' / '.join(p.get('preguntas',[]))) for p in flujo)
    obj_text = "\n".join(f'"{o["objecion"]}" → "{o["respuesta"]}"' for o in objs)
    reglas_hacer = "\n".join(f"✓ {r}" for r in reglas.get("hacer", []))
    reglas_nohacer = "\n".join(f"✗ {r}" for r in reglas.get("no_hacer", []))

    return f"""Eres Elena, asesora de {neg.get('nombre','Inversiones Soler')} 🏘️ — {neg.get('descripcion','')}

Tu única misión: cerrar consultoría inicial gratuita de 30 min para evaluar a fondo la inversión del cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- {identidad.get('tono','Profesional, analítico, asesor financiero')}
- Trato: {identidad.get('tratamiento','usted')}
- Máximo {identidad.get('max_palabras_respuesta',50)} palabras por mensaje.
- {identidad.get('emojis','🏘️ 📊 💰 con moderación')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPUESTA DE VALOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{neg.get('propuesta_valor','')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{serv_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE INVERSIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{tipos_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HONORARIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{pago_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUJO DE VENTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{flujo_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANEJO DE OBJECIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{obj_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WhatsApp: {ctc.get('whatsapp_link','')}
Facebook: {ctc.get('facebook_url','')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{reglas_hacer}
{reglas_nohacer}"""


def obtener_respuesta(id_usuario: str, mensaje_usuario: str) -> str:
    with _lock:
        if id_usuario not in conversaciones:
            conversaciones[id_usuario] = []
        conversaciones[id_usuario].append({"role": "user", "content": mensaje_usuario})
        mensajes = list(conversaciones[id_usuario])

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=construir_system_prompt(),
        messages=mensajes,
    )

    respuesta = ""
    for bloque in response.content:
        if bloque.type == "text":
            respuesta = bloque.text
            break

    with _lock:
        conversaciones[id_usuario].append({"role": "assistant", "content": respuesta})
        if len(conversaciones[id_usuario]) > MAX_HISTORY_MESSAGES:
            conversaciones[id_usuario] = conversaciones[id_usuario][-MAX_HISTORY_MESSAGES:]
    return respuesta


def verificar_token(req) -> bool:
    s = os.getenv("WEBHOOK_SECRET", "")
    if not s:
        return False
    t = req.headers.get("X-Webhook-Secret") or req.args.get("secret") or ""
    return secrets.compare_digest(t, s)


def validar_id_usuario(id_usuario: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_+\-]{1,50}$", id_usuario))


@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "status": "Elena Inversiones Soler activo 🏘️",
        "marca": "Inversiones Soler",
        "kb_cargada": bool(KB),
        "kb_servicios": len(KB.get("servicios", [])),
        "kb_faq": len(KB.get("faq", [])),
    })


@app.route("/stats", methods=["GET"])
def stats():
    return jsonify({
        "conversaciones": {"total": len(conversaciones)},
        "kb_cargada": bool(KB),
        "kb_servicios": len(KB.get("servicios", [])),
    })


@app.route("/chat", methods=["POST"])
def chat():
    if not verificar_token(request):
        return jsonify({"error": "No autorizado"}), 401
    datos = request.get_json(silent=True) or {}
    mensaje = (datos.get("mensaje") or datos.get("message") or datos.get("body") or "").strip()
    id_usuario = str(datos.get("id_usuario") or datos.get("from") or f"test-{uuid.uuid4().hex[:6]}")
    if not validar_id_usuario(id_usuario):
        return jsonify({"error": "ID invalido"}), 400
    if not mensaje:
        return jsonify({"error": "Mensaje vacio"}), 400
    try:
        respuesta = obtener_respuesta(id_usuario, mensaje)
        return jsonify({"respuesta": respuesta, "reply": respuesta})
    except Exception as e:
        logger.exception("Error: %s", e)
        return jsonify({"error": "Error interno"}), 500


@app.route("/webhook", methods=["POST"])
def webhook():
    if not verificar_token(request):
        return jsonify({"error": "No autorizado"}), 401
    datos = request.get_json(silent=True) or {}
    id_usuario = str(datos.get("from") or datos.get("sender") or "desconocido")
    mensaje = (datos.get("body") or datos.get("text") or "").strip()
    if not validar_id_usuario(id_usuario) or not mensaje:
        return jsonify({"error": "Bad request"}), 400
    try:
        return jsonify({"reply": obtener_respuesta(id_usuario, mensaje)})
    except Exception as e:
        logger.exception("Error: %s", e)
        return jsonify({"error": "Error interno"}), 500


if __name__ == "__main__":
    port = int(os.getenv("INVERSIONES_PORT", "5003"))
    logger.info(f"Bot Elena Inversiones Soler iniciando en puerto {port}")
    logger.info(f"KB cargada: {len(KB.get('servicios',[]))} servicios, {len(KB.get('faq',[]))} FAQs")
    app.run(host="0.0.0.0", port=port, debug=False)
