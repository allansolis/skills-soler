"""
Bot de ventas Elena — Esmeraldas SOLER
Webhook HTTP compatible con Make.com, n8n, WATI, Twilio, etc.
"""

import os
import re
import uuid
import logging
import secrets
import threading
from flask import Flask, request, jsonify
from anthropic import Anthropic
from dotenv import load_dotenv

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
client = Anthropic()

# Historial de conversaciones con thread lock
conversaciones: dict[str, list] = {}
_lock = threading.Lock()

# ─────────────────────────────────────────────
# SISTEMA: Personalidad y conocimiento de Elena
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """Eres Elena, asesora oficial de Esmeraldas SOLER 💎 — joyería exclusiva especializada en esmeraldas 100% naturales.

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

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=mensajes,
        thinking={"type": "adaptive"},
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
    return jsonify({"status": "Elena bot activo 💎", "marca": "Esmeraldas SOLER"})


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

    respuesta = obtener_respuesta(id_usuario, mensaje)
    with _lock:
        turnos = len(conversaciones.get(id_usuario, [])) // 2
    return jsonify({
        "id": id_usuario,
        "mensaje": mensaje,
        "respuesta": respuesta,
        "turnos": turnos
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
