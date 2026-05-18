"""
Bot de ventas Elena — Esmeraldas SOLER
Webhook HTTP compatible con Make.com, n8n, WATI, Twilio, etc.

KB se carga desde kb_esmeraldas.json — editable por Agent 7 KB Updater (n8n)
o por humanos sin tocar el código Python.
"""

# Windows cert store integration — necesario porque Norton AV hace MITM en TLS
# Esto debe ir ANTES de cualquier import que use ssl/httpx (anthropic, requests, etc.)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass  # opcional — solo necesario en Windows con AV interceptando TLS

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

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("elena")

# ─────────────────────────────────────────────
# CONFIG (via env vars, con defaults seguros)
# ─────────────────────────────────────────────
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "512"))
MAX_MESSAGE_LENGTH = int(os.getenv("MAX_MESSAGE_LENGTH", "1000"))
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "30"))

app = Flask(__name__)

# Lead scoring + handoff endpoints
try:
    from lead_endpoints import register_lead_endpoints
    register_lead_endpoints(app, business="esmeraldas_soler")
except Exception as _e:  # noqa: BLE001
    logging.warning("lead_endpoints no disponible: %s", _e)

# Cargar API key explícitamente desde .env (más robusto que confiar en load_dotenv)
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
    raise RuntimeError("ANTHROPIC_API_KEY no encontrado en .env ni en variables de entorno")

client = Anthropic(api_key=_api_key)

# Historial de conversaciones con thread lock
conversaciones: dict[str, list] = {}
_lock = threading.Lock()

# ─────────────────────────────────────────────
# KB: se carga desde kb_esmeraldas.json
# ─────────────────────────────────────────────
KB_PATH = Path(__file__).parent / "kb_esmeraldas.json"


def cargar_kb() -> dict:
    """Carga KB desde JSON. Si falla, retorna dict vacío y bot se comporta en modo degradado."""
    try:
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Error cargando KB Esmeraldas: %s", e)
        return {}


KB = cargar_kb()


def _listar(items: list, sep: str = "\n- ", prefix: str = "- ") -> str:
    if not items:
        return ""
    return prefix + sep.join(items)


def generar_kb_texto() -> str:
    """Construye el system prompt a partir de KB JSON."""
    if not KB:
        return "KB Esmeraldas no disponible — respuesta degradada."

    neg = KB.get("negocio", {})
    ctc = KB.get("contacto", {})
    productos = KB.get("productos", [])
    promos = KB.get("promociones", [])
    pago = KB.get("formas_pago", {})
    flujo = KB.get("flujo_venta", [])
    tipos = KB.get("tipos_cliente", {})
    objs = KB.get("objeciones", [])
    identidad = KB.get("identidad", {})
    reglas = KB.get("reglas_absolutas", {})

    # Productos
    prod_lines = []
    for p in productos:
        desde = f"desde ₡{p['desde']:,}".replace(",", ".") if p.get("desde") else p.get("nota", "precio según pieza")
        prod_lines.append(f"- {p['categoria']}: {desde}")
    prod_text = "\n".join(prod_lines)

    # Promos
    promo_text = "\n".join(f"- {p['descripcion']}" for p in promos)

    # Pagos
    pago_lines = []
    for metodo, data in pago.items():
        if isinstance(data, dict) and data.get("frase"):
            pago_lines.append(f'{metodo.upper().replace("_", " ")} → "{data["frase"]}"')
    pago_text = "\n".join(pago_lines)

    # Flujo
    flujo_lines = []
    for p in flujo:
        linea = f'PASO {p["paso"]} — {p["nombre"].upper()}'
        flujo_lines.append(linea)
        for ej in p.get("ejemplos", []):
            flujo_lines.append(f'"{ej}"')
        if p.get("ejemplo"):
            flujo_lines.append(f'"{p["ejemplo"]}"')
        for preg in p.get("preguntas", []):
            flujo_lines.append(f'"{preg}"')
        for fr in p.get("frases", []):
            flujo_lines.append(f'- "{fr}"')
    flujo_text = "\n".join(flujo_lines)

    # Tipos de cliente
    tipos_text = "\n".join(f"{k.upper():<10} → {v}" for k, v in tipos.items())

    # Objeciones
    obj_text = "\n".join(f'"{o["objecion"]}" → "{o["respuesta"]}"' for o in objs)

    reglas_hacer = _listar(reglas.get("hacer", []), sep="\n✓ ", prefix="✓ ")
    reglas_nohacer = _listar(reglas.get("no_hacer", []), sep="\n✗ ", prefix="✗ ")

    return f"""Eres Elena, asesora oficial de {neg.get('nombre', 'Esmeraldas SOLER')} 💎 — {neg.get('descripcion', 'joyería exclusiva')}

Tu única misión: convertir cada conversación en una venta. No informas, CIERRAS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- {identidad.get('tono', 'Elegante, segura, cálida y directa')}
- Tratas siempre de "{identidad.get('tratamiento', 'usted')}". Usas el nombre del cliente en cuanto lo sabes.
- Respuestas cortas: máximo {identidad.get('max_palabras_respuesta', 35)} palabras. Una idea por mensaje.
- {identidad.get('emojis', 'Emojis sutiles 💎 ✨')}
- {identidad.get('idioma', 'Solo hablas español')}. Si piden otro idioma: "{identidad.get('respuesta_idioma_otro', 'Solo atiendo en español, con gusto le ayudo aquí.')}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPUESTA DE VALOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{neg.get('propuesta_valor', '')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTOS Y PRECIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{prod_text}

REGLA: No des precios de piezas que no estén en el catálogo especificado.
Certificado de autenticidad disponible en todas las piezas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMOCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{promo_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAS DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el cliente elige, das exactamente estos datos:

{pago_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUJO DE VENTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{flujo_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE CLIENTE Y CÓMO HABLARLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{tipos_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANEJO DE OBJECIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{obj_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANALES (prioridad: WhatsApp)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WhatsApp:  {ctc.get('whatsapp_link', '')}
Instagram: {ctc.get('instagram_url', '')}
Facebook:  {ctc.get('facebook_url', '')}
Teléfono:  {ctc.get('telefono', '')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{reglas_hacer}
{reglas_nohacer}"""


def construir_system_prompt() -> str:
    """System prompt construido desde KB. Se regenera en cada request para reflejar KB actualizada."""
    return generar_kb_texto()


SYSTEM_PROMPT_LEGACY = """Eres Elena, asesora oficial de Esmeraldas SOLER 💎 — joyería exclusiva especializada en esmeraldas 100% naturales.

Tu única misión: convertir cada conversación en una venta. No informas, CIERRAS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Elegante, segura, cálida y directa.
- Tratas siempre de "usted". Usas el nombre del cliente en cuanto lo sabes.
- Respuestas cortas: máximo 35 palabras. Una idea por mensaje.
- Emojis sutiles 💎 ✨ solo cuando refuerzan el valor.
- Solo hablas español. Si piden otro idioma: "Solo atiendo en español, con gusto le ayudo aquí."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESMERALDAS SOLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Joyería 100% virtual con envíos a todo el país.
- Esmeraldas naturales certificadas — no bisutería, gemas reales.
- Reuniones presenciales disponibles para ver las piezas en persona.
- Cada pieza es única, no manejamos inventario masivo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTOS Y PRECIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Aretes:              desde ₡30.000
- Cadenas:             desde ₡30.000
- Anillos:             desde ₡50.000
- Dijes:               precio según pieza
- Diseños personalizados: precio según diseño

REGLA: No des precios de piezas que no estén en el catálogo especificado.
Certificado de autenticidad disponible en todas las piezas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMOCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 25% de descuento en la tercera compra.
- Descuento especial el día del cumpleaños del cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAS DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el cliente elige, das exactamente estos datos:

SINPE → "Al número 87530064 a nombre de Jazmín Solís Alvarado."
PayPal → "Aquí puede pagar: https://paypal.me/asolisa"
Transferencia colones → "Cuenta: CR97081400011020057029"
Transferencia dólares (solo si lo piden) → "Cuenta: CR68081400012020057032"
Tarjeta → "Pago con datáfono al momento de la entrega 💳"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUJO DE VENTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1 — SALUDO
"Hola, soy Elena de Esmeraldas SOLER 💎 ¿Con quién tengo el gusto?"
Luego: "¿Qué tipo de joya con esmeralda está buscando?"

PASO 2 — PERFILADO (máximo 2 preguntas)
"¿Es para usted o para regalar?"
"¿Busca algo elegante, llamativo o muy exclusivo?"
→ Detecta el tipo de cliente y adapta tu tono.

PASO 3 — PRESENTACIÓN
"Le recomiendo esta pieza 💎 — esmeralda natural, única, con certificado. No es masiva, es exclusiva."

PASO 4 — ACTIVACIÓN EMOCIONAL
Frases que generan deseo:
- "Tiene una presencia que se nota de inmediato."
- "Es el tipo de joya que los clientes más selectos eligen."
- "No es solo una joya — es algo que habla por usted."

PASO 5 — CIERRE POR ASUNCIÓN (nunca preguntes si quiere comprar)
"Le voy a reservar esta pieza ahora mismo 💎"

PASO 6 — CIERRE POR ALTERNATIVA (nunca preguntes "si" compra, pregunta "cómo" paga)
"¿Prefiere SINPE, transferencia, PayPal o tarjeta al recibir?"

PASO 7 — DAR DATOS DE PAGO
Según lo que elija, entrega los datos exactos del método seleccionado.

PASO 8 — CONFIRMAR ENVÍO
"Para coordinar su entrega, compártame la dirección exacta 📍"
"Así queda todo listo y su pieza asegurada a su nombre 💎"

PASO 9 — LINK DE APOYO (úsalo si el cliente duda o quiere ver más)
"Puede asegurarla directamente aquí: https://wa.me/p/26418820444470989/50687985656"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE CLIENTE Y CÓMO HABLARLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMOCIONAL  → Deseo, lujo, energía de la piedra, exclusividad sensorial.
LÓGICO     → Inversión, valor real, certificado, calidad comprobable.
INDECISO   → Urgencia suave: "Estas piezas salen rápido, muchos clientes las aseguran al momento."
REGATEADOR → Valor firme: "No es bisutería. Es una gema natural certificada — eso tiene un valor real."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANEJO DE OBJECIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Está caro"    → "Es una esmeralda natural certificada, no bisutería. Eso es lo que tiene ese valor 💎"
"Voy a pensarlo" → "Claro, solo tenga en cuenta que no manejamos inventario repetido."
"No sé si me gusta" → "Es normal. ¿Le gustaría coordinar una reunión para verla en persona?"
"No tengo efectivo" → "Puede pagar con tarjeta al recibir, sin problema."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANALES (prioridad: WhatsApp)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WhatsApp:  https://wa.me/p/26418820444470989/50687985656
Instagram: https://www.instagram.com/esmeraldas_soler
Facebook:  https://www.facebook.com/share/1Ctv3jVPX6
Teléfono:  +506 8798 5656

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Siempre asumir la compra — nunca preguntar "¿lo quiere comprar?"
✓ Siempre llevar al pago — dar datos exactos según el método elegido.
✓ Siempre pedir dirección de entrega antes de terminar.
✓ Mantener el tono de marca de lujo en todo momento.
✗ Nunca sonar robótica, fría ni insegura.
✗ Nunca saturar con información técnica.
✗ Nunca cerrar en pregunta débil."""


def obtener_respuesta(id_usuario: str, mensaje_usuario: str) -> str:
    """Procesa el mensaje del usuario y retorna la respuesta de Elena."""

    with _lock:
        if id_usuario not in conversaciones:
            conversaciones[id_usuario] = []

        conversaciones[id_usuario].append({
            "role": "user",
            "content": mensaje_usuario
        })

        mensajes = list(conversaciones[id_usuario])

    # System prompt generado en cada request desde KB JSON (permite hot-reload)
    system_prompt = construir_system_prompt()

    # Model router (opcional): elige Haiku para mensajes simples, Sonnet para complejos
    selected_model = CLAUDE_MODEL
    try:
        from model_router import route_model
        route = route_model(
            user_message=mensaje_usuario,
            conversation_turns=len(mensajes) // 2,
            business="esmeraldas_soler"
        )
        selected_model = route["model"]
        logger.debug("model_router: %s (razon: %s)", selected_model, route["reason"])
    except ImportError:
        pass

    response = client.messages.create(
        model=selected_model,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=system_prompt,
        messages=mensajes,
    )

    respuesta = ""
    for bloque in response.content:
        if bloque.type == "text":
            respuesta = bloque.text
            break

    with _lock:
        conversaciones[id_usuario].append({
            "role": "assistant",
            "content": respuesta
        })

        if len(conversaciones[id_usuario]) > MAX_HISTORY_MESSAGES:
            conversaciones[id_usuario] = conversaciones[id_usuario][-MAX_HISTORY_MESSAGES:]

    return respuesta


def verificar_token(req) -> bool:
    """Verifica el token secreto del webhook. Fail-secure: rechaza si no hay secret."""
    webhook_secret = os.getenv("WEBHOOK_SECRET", "")
    if not webhook_secret:
        logger.warning("SECURITY: WEBHOOK_SECRET no configurado — rechazando request de %s", req.remote_addr)
        return False
    token = req.headers.get("X-Webhook-Secret") or req.args.get("secret") or ""
    return secrets.compare_digest(token, webhook_secret)


def validar_id_usuario(id_usuario: str) -> bool:
    """Valida que el ID de usuario sea alfanumerico seguro."""
    return bool(re.match(r"^[a-zA-Z0-9_+\-]{1,50}$", id_usuario))


# ─────────────────────────────────────────────
# RUTAS
# ─────────────────────────────────────────────

@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "status": "Elena bot activo 💎",
        "marca": "Esmeraldas SOLER",
        "kb_cargada": bool(KB),
        "kb_productos": len(KB.get("productos", [])),
        "kb_faq": len(KB.get("faq", [])),
        "kb_objeciones": len(KB.get("objeciones", [])),
    })


@app.route("/stats", methods=["GET"])
def stats():
    """Stats JSON — compatible con el endpoint de Glass Soler."""
    total_conv = len(conversaciones)
    return jsonify({
        "conversaciones": {"total": total_conv},
        "kb_cargada": bool(KB),
        "kb_productos": len(KB.get("productos", [])),
        "kb_faq": len(KB.get("faq", [])),
        "kb_objeciones": len(KB.get("objeciones", [])),
        "kb_meta_ads": KB.get("meta_ads", {}),
    })


@app.route("/kb/reload", methods=["POST"])
def kb_reload():
    """Recarga KB desde disco sin reiniciar el bot. Usado por Agent 7 KB Updater."""
    if not verificar_token(request):
        return jsonify({"error": "No autorizado"}), 401
    global KB
    KB = cargar_kb()
    return jsonify({
        "status": "ok",
        "kb_cargada": bool(KB),
        "kb_productos": len(KB.get("productos", [])),
        "kb_faq": len(KB.get("faq", [])),
    })


@app.route("/webhook", methods=["POST"])
def webhook():
    """
    Endpoint principal del webhook.

    Espera JSON con al menos:
    {
        "from": "50687985656",       // número o ID del usuario
        "body": "Hola, quiero ver anillos"  // mensaje del usuario
    }

    Retorna:
    {
        "reply": "Hola, soy Elena de Esmeraldas SOLER 💎 ..."
    }
    """
    if not verificar_token(request):
        logger.warning("SECURITY: Webhook no autorizado desde %s", request.remote_addr)
        return jsonify({"error": "No autorizado"}), 401

    datos = request.get_json(silent=True) or {}

    id_usuario = str(
        datos.get("from")
        or datos.get("sender")
        or datos.get("user_id")
        or datos.get("phone")
        or "desconocido"
    )

    if not validar_id_usuario(id_usuario):
        return jsonify({"error": "ID de usuario invalido"}), 400

    mensaje = (
        datos.get("body")
        or datos.get("message")
        or datos.get("text")
        or datos.get("content")
        or ""
    ).strip()

    if not mensaje:
        return jsonify({"error": "Mensaje vacio"}), 400

    if len(mensaje) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Mensaje muy largo (max {MAX_MESSAGE_LENGTH} caracteres)"}), 400

    try:
        respuesta = obtener_respuesta(id_usuario, mensaje)
        return jsonify({"reply": respuesta})
    except Exception as e:
        error_id = str(uuid.uuid4())[:8]
        logger.error("[%s] Error procesando mensaje de %s: %s", error_id, id_usuario, e, exc_info=True)
        return jsonify({"error": "Error interno", "error_id": error_id}), 500


@app.route("/chat", methods=["POST"])
def chat_directo():
    """Endpoint de prueba (requiere autenticacion)."""
    if not verificar_token(request):
        logger.warning("SECURITY: /chat no autorizado desde %s", request.remote_addr)
        return jsonify({"error": "No autorizado"}), 401

    datos = request.get_json(silent=True) or {}
    id_usuario = datos.get("id", "test")
    mensaje = datos.get("mensaje", "").strip()

    if not mensaje:
        return jsonify({"error": "Falta el campo 'mensaje'"}), 400

    if len(mensaje) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Mensaje muy largo (max {MAX_MESSAGE_LENGTH} caracteres)"}), 400

    # Auto-score + posibles notificaciones
    try:
        from lead_endpoints import auto_score
        lead_info = auto_score(id_usuario, mensaje, "esmeraldas_soler")
    except Exception as _e:
        logger.warning("auto_score fallo: %s", _e)
        lead_info = None

    respuesta = obtener_respuesta(id_usuario, mensaje)
    with _lock:
        turnos = len(conversaciones.get(id_usuario, [])) // 2
    return jsonify({
        "id": id_usuario,
        "mensaje": mensaje,
        "respuesta": respuesta,
        "turnos": turnos,
        "lead": lead_info,
    })


@app.route("/reset/<id_usuario>", methods=["POST"])
def resetear_conversacion(id_usuario: str):
    """Elimina el historial de un usuario (requiere autenticacion)."""
    if not verificar_token(request):
        logger.warning("SECURITY: /reset no autorizado desde %s", request.remote_addr)
        return jsonify({"error": "No autorizado"}), 401

    with _lock:
        if id_usuario in conversaciones:
            del conversaciones[id_usuario]
    logger.info("Conversacion de %s reiniciada", id_usuario)
    return jsonify({"status": "ok", "mensaje": f"Conversacion de {id_usuario} reiniciada"})


@app.route("/historial/<id_usuario>", methods=["GET"])
def ver_historial(id_usuario: str):
    """Retorna el historial de un usuario (requiere autenticacion)."""
    if not verificar_token(request):
        logger.warning("SECURITY: /historial no autorizado desde %s", request.remote_addr)
        return jsonify({"error": "No autorizado"}), 401

    with _lock:
        historial = list(conversaciones.get(id_usuario, []))
    return jsonify({"id": id_usuario, "turnos": len(historial) // 2, "historial": historial})


# ─────────────────────────────────────────────
# INICIO
# ─────────────────────────────────────────────

@app.after_request
def add_security_headers(response):
    """Agrega headers de seguridad a todas las respuestas."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


if __name__ == "__main__":
    puerto = int(os.getenv("PORT", 5000))
    logger.info("""
╔══════════════════════════════════════╗
║   Elena Bot — Esmeraldas SOLER 💎   ║
╚══════════════════════════════════════╝

Servidor activo en http://localhost:{puerto}

Endpoints:
  GET  /              → Estado del bot
  POST /webhook       → Recibe mensajes de WhatsApp/Make/n8n
  POST /chat          → Prueba directa del bot
  POST /reset/<id>    → Reinicia conversación
  GET  /historial/<id>→ Ver historial

Ejemplo de prueba:
  curl -X POST http://localhost:{puerto}/chat \\
    -H "Content-Type: application/json" \\
    -H "X-Webhook-Secret: $WEBHOOK_SECRET" \\
    -d '{{"id": "cliente1", "mensaje": "Hola, me interesa un anillo"}}'
    """)
    app.run(host="0.0.0.0", port=puerto, debug=False)
