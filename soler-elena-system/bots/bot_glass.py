"""
Bot de ventas Elena — Glass Soler
Multi-canal: WhatsApp Business API + Facebook Messenger + Instagram DM
Especializado en polarizado de seguridad con agendamiento de citas.
Compatible con n8n, Meta Webhooks directos, WATI, Twilio.
"""

# Windows cert store integration — necesario porque Norton AV hace MITM en TLS
# Esto debe ir ANTES de cualquier import que use ssl/httpx (anthropic, requests, etc.)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass  # opcional — solo necesario en Windows con AV interceptando TLS

import json
import os
import re
import uuid
import logging
import hmac
import hashlib
import secrets
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
from flask import Flask, request, jsonify
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(override=True)

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("elena_glass")

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "600"))
MAX_MESSAGE_LENGTH = int(os.getenv("MAX_MESSAGE_LENGTH", "1500"))
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "30"))

# Meta API
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "glass_soler_verify_2026")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
META_PAGE_ID = os.getenv("META_PAGE_ID", "860529027138846")
META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "")
META_API_VERSION = os.getenv("META_API_VERSION", "v25.0")

# Webhook Secret (para n8n y otros)
WEBHOOK_SECRET = os.getenv("GLASS_WEBHOOK_SECRET", "")

# CRM Integration
CRM_BASE_URL = os.getenv("CRM_BASE_URL", "http://localhost:3000")

app = Flask(__name__)

# Lead scoring + handoff endpoints
try:
    from lead_endpoints import register_lead_endpoints
    register_lead_endpoints(app, business="glass_soler")
except Exception as _e:  # noqa: BLE001
    print(f"[warn] lead_endpoints no disponible: {_e}")

# Cargar API key — fallback a lectura directa del .env si getenv falla
_api_key = os.getenv("ANTHROPIC_API_KEY", "")
if not _api_key:
    # Leer directamente del .env como fallback
    _env_path = Path(__file__).parent / ".env"
    if _env_path.exists():
        with open(_env_path, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line.startswith("ANTHROPIC_API_KEY=") and not _line.startswith("#"):
                    _api_key = _line.split("=", 1)[1].strip()
                    break
if _api_key:
    logger.info("✅ ANTHROPIC_API_KEY cargada (%s...)", _api_key[:12])
else:
    logger.error("⚠️ ANTHROPIC_API_KEY no encontrada — el bot no podrá responder")
client = Anthropic(api_key=_api_key) if _api_key else None

conversaciones: dict[str, list] = {}
citas: dict[str, dict] = {}
_lock = threading.Lock()

# ─────────────────────────────────────────────
# KNOWLEDGE BASE — cargada desde JSON
# ─────────────────────────────────────────────
KB_PATH = Path(__file__).parent / "kb_glass_soler.json"


def cargar_kb() -> dict:
    """Carga la base de conocimiento desde el archivo JSON."""
    try:
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error("Error cargando KB: %s", e)
        return {}


KB = cargar_kb()


def generar_kb_texto() -> str:
    """Genera texto formateado de la KB para el system prompt."""
    if not KB:
        return "KB no disponible."

    secciones = []

    # Paquetes
    paquetes = KB.get("paquetes", [])
    if paquetes:
        lineas = ["PAQUETES DE POLARIZADO DE SEGURIDAD:"]
        for p in paquetes:
            lineas.append(
                f"  • {p['nombre']} ({p['grosor']}): {p['precio']}"
            )
            lineas.append(f"    → {p.get('beneficio_clave', '')}")
            specs = p.get("specs", {})
            if isinstance(specs, dict) and "resistencia_tension" in specs:
                lineas.append(
                    f"    Specs: Tensión {specs['resistencia_tension']}, "
                    f"Quiebre {specs['resistencia_quiebre']}, "
                    f"UV {specs['proteccion_uv']}, "
                    f"VLT {specs['transmision_luz_vlt']}"
                )
        secciones.append("\n".join(lineas))

    # Beneficios
    beneficios = KB.get("beneficios_generales", [])
    if beneficios:
        lineas = ["BENEFICIOS DE NUESTRAS PELÍCULAS:"]
        for b in beneficios:
            lineas.append(f"  {b['titulo']}:")
            for d in b.get("detalles", [])[:2]:
                lineas.append(f"    - {d}")
        secciones.append("\n".join(lineas))

    # Proceso
    proceso = KB.get("proceso_instalacion", [])
    if proceso:
        lineas = ["PROCESO DE INSTALACIÓN:"]
        for p in proceso:
            lineas.append(f"  Paso {p['paso']}: {p['titulo']}")
        secciones.append("\n".join(lineas))

    # FAQ
    faq = KB.get("faq", [])
    if faq:
        lineas = ["PREGUNTAS FRECUENTES:"]
        for f_item in faq:
            lineas.append(f"  P: {f_item['pregunta']}")
            lineas.append(f"  R: {f_item['respuesta']}")
        secciones.append("\n".join(lineas))

    # Formas de pago
    pago = KB.get("formas_pago", {})
    if pago:
        lineas = ["FORMAS DE PAGO:"]
        for metodo, detalle in pago.items():
            lineas.append(f"  {metodo.upper()}: {detalle}")
        secciones.append("\n".join(lineas))

    return "\n\n".join(secciones)


# ─────────────────────────────────────────────
# HORARIOS Y CITAS
# ─────────────────────────────────────────────
HORARIOS_BASE = {
    "lunes": ["8:00", "9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
    "martes": ["8:00", "9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
    "miercoles": ["8:00", "9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
    "jueves": ["8:00", "9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
    "viernes": ["8:00", "9:00", "10:00", "11:00", "13:00", "14:00", "15:00"],
    "sabado": ["8:00", "9:00", "10:00", "11:00"],
}

DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def obtener_horarios_disponibles() -> str:
    """Retorna horarios disponibles para los próximos 7 días."""
    hoy = datetime.now()
    disponibles = []

    for i in range(1, 8):
        fecha = hoy + timedelta(days=i)
        dia_nombre = DIAS_SEMANA[fecha.weekday()]
        if dia_nombre in HORARIOS_BASE:
            fecha_str = fecha.strftime("%d/%m/%Y")
            horas_ocupadas = [
                c["hora"] for c in citas.values()
                if c["fecha"] == fecha_str and c["estado"] == "confirmada"
            ]
            horas_libres = [
                h for h in HORARIOS_BASE[dia_nombre]
                if h not in horas_ocupadas
            ]
            if horas_libres:
                disponibles.append(
                    f"  {dia_nombre.capitalize()} {fecha_str}: {', '.join(horas_libres)}"
                )

    if not disponibles:
        return "No hay horarios disponibles esta semana. Contactar para opciones especiales."
    return "Horarios disponibles:\n" + "\n".join(disponibles)


def registrar_cita(
    nombre: str,
    vehiculo: str,
    servicio: str,
    fecha: str,
    hora: str,
    usuario_id: str,
    canal: str = "whatsapp",
) -> str:
    """Registra una cita y retorna el ID."""
    cita_id = str(uuid.uuid4())[:8]
    with _lock:
        citas[cita_id] = {
            "cliente": nombre,
            "vehiculo": vehiculo,
            "servicio": servicio,
            "fecha": fecha,
            "hora": hora,
            "usuario_id": usuario_id,
            "canal": canal,
            "estado": "confirmada",
            "creada": datetime.now().isoformat(),
        }
    logger.info("CITA AGENDADA [%s]: %s - %s %s via %s", cita_id, nombre, fecha, hora, canal)

    # Notificar al CRM (fire-and-forget)
    _notificar_crm_cita(cita_id, citas[cita_id])

    return cita_id


def _notificar_crm_cita(cita_id: str, cita: dict) -> None:
    """Envía la cita al CRM local (non-blocking)."""
    def _enviar():
        try:
            requests.post(
                f"{CRM_BASE_URL}/api/activities",
                json={
                    "type": "appointment",
                    "description": (
                        f"Cita Glass Soler: {cita['servicio']} - "
                        f"{cita['vehiculo']} - {cita['fecha']} {cita['hora']}"
                    ),
                    "contactName": cita["cliente"],
                    "source": f"bot_glass_{cita['canal']}",
                },
                timeout=5,
            )
        except Exception as e:
            logger.warning("No se pudo notificar CRM: %s", e)

    threading.Thread(target=_enviar, daemon=True).start()


# ─────────────────────────────────────────────
# SYSTEM PROMPT — Elena para Glass Soler
# ─────────────────────────────────────────────
def construir_system_prompt(canal: str = "whatsapp") -> str:
    """Construye el system prompt con KB actualizada y horarios en tiempo real."""
    kb_texto = generar_kb_texto()
    horarios = obtener_horarios_disponibles()

    canal_emoji = {"whatsapp": "📱", "instagram": "📸", "facebook": "💬", "messenger": "💬"}
    emoji = canal_emoji.get(canal, "💬")

    return f"""Eres Elena, asesora oficial de Glass Soler {emoji} — especialistas en polarizado de seguridad para vehículos.

Tu misión: convertir cada conversación en una CITA AGENDADA. No informas, CIERRAS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Profesional, confiable, cálida y directa.
- Tratas de "usted" hasta que el cliente prefiera tuteo.
- Usas el nombre del cliente apenas lo sabes.
- Respuestas cortas: máximo 40 palabras. Una idea por mensaje.
- Emojis sutiles 🚗 🛡️ solo cuando refuerzan el valor.
- Solo hablas español. Si piden otro idioma: "Solo atiendo en español, con gusto le ayudo aquí."
- Canal actual: {canal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLASS SOLER — ¿Cuánto vale tu seguridad?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Especialistas en polarizado de seguridad para vehículos y propiedades.
- Películas 100% importadas de Estados Unidos.
- Estándares internacionales de seguridad y rendimiento.
- Más de 50 vehículos instalados con 98% satisfacción.
- Taller profesional + servicio a domicilio disponible.
- Garantía en todos los trabajos.
- Sitio web: glasssoler.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASE DE CONOCIMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{kb_texto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAS DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SINPE → "Al número 63790438 a nombre de Allan Solís."
Tarjeta → "Aceptamos tarjeta en el taller con datáfono."
Efectivo → "Pago al momento de la entrega del trabajo."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUJO DE VENTA — CIERRE POR CITA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1 — SALUDO
"Hola, soy Elena de Glass Soler 🛡️ ¿Con quién tengo el gusto?"
Luego: "¿Qué tipo de protección necesita para su vehículo?"

PASO 2 — PERFILADO (máximo 3 preguntas)
"¿Qué vehículo tiene? (marca, modelo, año)"
"¿Busca protección básica o máxima seguridad?"
"¿Prefiere venir al taller o servicio a domicilio?"

PASO 3 — RECOMENDACIÓN
Según el vehículo y necesidad, recomendar el paquete ideal:
- Vehículo estándar → Básico (₡299,000) o Full (₡499,000)
- Alta gama / seguridad → Premium (₡999,000) o Máxima Protección
- Propiedad/local → Cotización personalizada

PASO 4 — ACTIVACIÓN EMOCIONAL
Frases que generan urgencia:
- "¿Cuánto vale su seguridad y la de su familia?"
- "Un vidrio reforzado puede hacer la diferencia en un intento de robo."
- "El 99% de protección UV además cuida los interiores de su vehículo."
- "La película es transparente — nadie nota que está ahí, pero usted sí nota la protección."

PASO 5 — CIERRE POR AGENDAMIENTO
"Le tengo disponibilidad esta semana. ¿Cuál día le funciona mejor?"

PASO 6 — AGENDAR CITA
Cuando el cliente acepta:
"Perfecto, le confirmo:
- Nombre: [nombre]
- Vehículo: [marca modelo año]
- Paquete: [paquete elegido]
- Fecha: [día hora]
¿Todo correcto?"

PASO 7 — CONFIRMAR
"Listo, su cita está confirmada 🛡️ Le enviaremos un recordatorio. ¿Alguna otra consulta?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENDAMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Horario del taller:
- Lunes a Viernes: 8:00 AM - 5:00 PM (almuerzo 12:00-1:00)
- Sábado: 8:00 AM - 12:00 PM
- Domingo: Cerrado

HORARIOS DISPONIBLES ACTUALES:
{horarios}

Cuando el cliente quiera agendar:
1. Ofrece 2-3 opciones de horario disponibles
2. Confirma fecha, hora, vehículo y paquete
3. Responde con el formato EXACTO: [CITA_AGENDADA: nombre|vehiculo|paquete|fecha|hora]
   Ejemplo: [CITA_AGENDADA: Juan Pérez|Toyota RAV4 2022|Seguridad Full|22/04/2026|10:00]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URGENTE    → "Entiendo la urgencia. Tengo espacio disponible, ¿le reservo?"
COTIZADOR  → Dar precio + agendar: "Ese es el precio con instalación incluida. ¿Le agendo?"
INDECISO   → "Un vidrio sin protección es un riesgo real. Mejor atenderlo pronto."
COMPARADOR → "Usamos películas importadas de USA con garantía. La calidad se nota desde el primer día."
CURIOSO    → Explicar beneficios + invitar a agendar evaluación gratuita.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANEJO DE OBJECIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Está caro"     → "Es una inversión en su seguridad. Las películas son importadas con garantía. ¿Cuánto vale su tranquilidad?"
"Voy a pensarlo" → "Claro, pero cada día sin protección es un riesgo. Le reservo un espacio esta semana?"
"En otro lado es más barato" → "Nosotros usamos películas de USA con estándares internacionales. La diferencia se nota."
"No tengo tiempo" → "Podemos ir a domicilio sin problema. ¿Qué día le funciona?"
"No lo necesito" → "El polarizado de seguridad no es un lujo — es una barrera contra robos, UV y calor. Vale la pena evaluarlo."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACTO Y CANALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WhatsApp:  +506 6379 0438
Instagram: @glasssoler
Facebook:  Glass Soler
Email:     info@glasssoler.com
Web:       glasssoler.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ SIEMPRE llevar a agendar cita — nunca dejar ir sin intentar.
✓ Siempre pedir datos del vehículo antes de recomendar paquete.
✓ Siempre ofrecer servicio a domicilio como alternativa.
✓ Recomendar el paquete adecuado según necesidad, no el más caro.
✓ Mantener tono profesional y confiable.
✗ Nunca sonar insegura sobre precios o calidad.
✗ Nunca saturar con información técnica — ir directo al beneficio.
✗ Nunca cerrar en pregunta débil ("¿le interesa?"). Siempre asumir la cita.
✗ Nunca hablar de competidores por nombre.
✗ Nunca inventar datos técnicos — solo usar lo de la KB."""


# ─────────────────────────────────────────────
# PROCESAMIENTO DE MENSAJES
# ─────────────────────────────────────────────
def procesar_cita_desde_respuesta(respuesta: str, id_usuario: str, canal: str) -> str:
    """Detecta y registra citas agendadas en la respuesta del bot."""
    patron = r'\[CITA_AGENDADA:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]'
    match = re.search(patron, respuesta)
    if match:
        nombre, vehiculo, servicio, fecha, hora = [g.strip() for g in match.groups()]
        cita_id = registrar_cita(nombre, vehiculo, servicio, fecha, hora, id_usuario, canal)
        # Limpiar el tag de la respuesta visible
        respuesta = re.sub(patron, '', respuesta).strip()
        logger.info("Cita registrada ID=%s via %s", cita_id, canal)
    return respuesta


def obtener_respuesta(
    id_usuario: str,
    mensaje_usuario: str,
    canal: str = "whatsapp",
    nombre_usuario: Optional[str] = None,
) -> str:
    """Procesa el mensaje del usuario y retorna la respuesta de Elena."""
    # Agregar contexto del nombre si viene de Meta
    if nombre_usuario:
        contexto = f"[Nombre del cliente: {nombre_usuario}]\n{mensaje_usuario}"
    else:
        contexto = mensaje_usuario

    with _lock:
        if id_usuario not in conversaciones:
            conversaciones[id_usuario] = []
        conversaciones[id_usuario].append({
            "role": "user",
            "content": contexto,
        })
        if len(conversaciones[id_usuario]) > MAX_HISTORY_MESSAGES:
            conversaciones[id_usuario] = conversaciones[id_usuario][-MAX_HISTORY_MESSAGES:]
        mensajes = list(conversaciones[id_usuario])

    system_prompt = construir_system_prompt(canal)

    if client is None:
        logger.error("Cliente Anthropic no inicializado — falta ANTHROPIC_API_KEY")
        return "⚠️ El bot no está configurado correctamente. Contacte al administrador."

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=CLAUDE_MAX_TOKENS,
            system=system_prompt,
            messages=mensajes,
        )
    except Exception as e:
        logger.error("Error llamando a Claude API: %s", e)
        return f"⚠️ Error temporal del asistente. Por favor intente nuevamente."

    respuesta = ""
    for bloque in response.content:
        if bloque.type == "text":
            respuesta = bloque.text
            break

    # Procesar citas agendadas
    respuesta = procesar_cita_desde_respuesta(respuesta, id_usuario, canal)

    with _lock:
        conversaciones[id_usuario].append({
            "role": "assistant",
            "content": respuesta,
        })

    return respuesta


# ─────────────────────────────────────────────
# META API — Enviar mensajes
# ─────────────────────────────────────────────
def enviar_whatsapp(telefono: str, texto: str) -> bool:
    """Envía un mensaje de WhatsApp via Cloud API."""
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        logger.warning("META_ACCESS_TOKEN o META_PHONE_NUMBER_ID no configurado")
        return False

    url = f"https://graph.facebook.com/{META_API_VERSION}/{META_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": telefono,
        "type": "text",
        "text": {"body": texto},
    }
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            logger.info("WhatsApp enviado a %s", telefono[:6] + "***")
            return True
        logger.error("Error WhatsApp API: %s %s", resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.error("Error enviando WhatsApp: %s", e)
        return False


def enviar_messenger(recipient_id: str, texto: str) -> bool:
    """Envía un mensaje via Facebook Messenger / Instagram DM."""
    if not META_ACCESS_TOKEN:
        logger.warning("META_ACCESS_TOKEN no configurado")
        return False

    url = f"https://graph.facebook.com/{META_API_VERSION}/me/messages"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": texto},
    }
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            logger.info("Messenger/IG enviado a %s", recipient_id[:8] + "***")
            return True
        logger.error("Error Messenger API: %s %s", resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.error("Error enviando Messenger: %s", e)
        return False


# ─────────────────────────────────────────────
# SEGURIDAD
# ─────────────────────────────────────────────
@app.after_request
def security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return resp


def _sanitize_id(raw: str) -> str:
    """Limpia y normaliza el ID de usuario."""
    return re.sub(r"[^a-zA-Z0-9_+\-.]", "", str(raw))[:64] or "anon"


def verificar_firma_meta(payload: bytes, signature: str) -> bool:
    """Verifica la firma SHA256 del webhook de Meta."""
    if not META_APP_SECRET:
        return True  # Skip si no hay app secret configurado
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(
        META_APP_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


def verificar_webhook_secret(req) -> bool:
    """Verifica el secret del webhook para n8n/Make."""
    if not WEBHOOK_SECRET:
        return True  # No secret = aceptar todo (dev mode)
    token = req.headers.get("X-Webhook-Secret", "") or req.args.get("secret", "")
    return secrets.compare_digest(token, WEBHOOK_SECRET)


# ─────────────────────────────────────────────
# RUTAS — Estado
# ─────────────────────────────────────────────
@app.route("/")
def index():
    return jsonify({
        "status": "ok",
        "bot": "Elena - Glass Soler",
        "version": "2.0.0",
        "canales": ["whatsapp", "facebook", "instagram", "webhook"],
        "citas_activas": len([c for c in citas.values() if c["estado"] == "confirmada"]),
        "conversaciones_activas": len(conversaciones),
        "kb_cargada": bool(KB),
    })


# ─────────────────────────────────────────────
# RUTAS — Pages Legales (para Meta App publishing)
# ─────────────────────────────────────────────
PRIVACY_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Política de Privacidad — Glass Soler</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 780px; margin: 2rem auto; padding: 1.5rem; line-height: 1.6; color: #111; }
h1, h2 { color: #111; } h1 { border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
a { color: #2563eb; }
</style>
</head>
<body>
<h1>Política de Privacidad — Glass Soler</h1>
<p><strong>Última actualización:</strong> 22 de abril de 2026</p>

<h2>1. Quiénes somos</h2>
<p>Glass Soler es una empresa de instalación de polarizado de seguridad automotriz ubicada en Costa Rica. Sitio web: <a href="https://glasssoler.com">glasssoler.com</a>. Contacto: WhatsApp <strong>+506 6379 0438</strong>.</p>

<h2>2. Información que recopilamos</h2>
<ul>
<li><strong>Datos de contacto</strong>: nombre, teléfono, correo electrónico cuando nos contactas por WhatsApp, Facebook Messenger o Instagram Direct.</li>
<li><strong>Datos del vehículo</strong>: marca, modelo, año — para cotizar el servicio de polarizado.</li>
<li><strong>Historial de conversación</strong> con nuestro asistente virtual Elena, usado exclusivamente para dar seguimiento comercial.</li>
</ul>

<h2>3. Cómo usamos tu información</h2>
<ul>
<li>Responder tus consultas y cotizar servicios.</li>
<li>Agendar citas de instalación.</li>
<li>Mejorar nuestra atención al cliente.</li>
<li>Enviarte seguimiento comercial relacionado con el servicio solicitado.</li>
</ul>

<h2>4. Con quién compartimos tu información</h2>
<p>No vendemos ni compartimos tus datos personales con terceros para fines publicitarios. Usamos proveedores de servicio tecnológico (Meta, Anthropic) únicamente para el procesamiento técnico de los mensajes.</p>

<h2>5. Tus derechos</h2>
<p>Puedes solicitar el acceso, corrección o eliminación de tus datos personales escribiendo a <a href="mailto:allann.solis.94@gmail.com">allann.solis.94@gmail.com</a> o por WhatsApp al +506 6379 0438.</p>

<h2>6. Eliminación de datos</h2>
<p>Para eliminar tus datos, envíanos un mensaje con el asunto "Eliminar datos" a los canales indicados. Procesaremos la solicitud en un plazo máximo de 30 días.</p>

<h2>7. Cookies y tecnologías similares</h2>
<p>Nuestro sitio web usa cookies esenciales para el funcionamiento. No usamos cookies de rastreo de terceros para publicidad.</p>

<h2>8. Cambios a esta política</h2>
<p>Podemos actualizar esta política. La versión más reciente estará siempre disponible en esta misma URL.</p>

<h2>9. Contacto</h2>
<p>Para cualquier consulta sobre privacidad: <a href="mailto:allann.solis.94@gmail.com">allann.solis.94@gmail.com</a></p>
</body>
</html>"""

TERMS_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Términos y Condiciones — Glass Soler</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 780px; margin: 2rem auto; padding: 1.5rem; line-height: 1.6; color: #111; }
h1, h2 { color: #111; } h1 { border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
a { color: #2563eb; }
</style>
</head>
<body>
<h1>Términos y Condiciones — Glass Soler</h1>
<p><strong>Última actualización:</strong> 22 de abril de 2026</p>

<h2>1. Aceptación</h2>
<p>Al usar nuestros servicios o contactarnos por cualquier canal (WhatsApp, Facebook, Instagram, web), aceptas estos términos.</p>

<h2>2. Servicios</h2>
<p>Glass Soler ofrece instalación de polarizado de seguridad para vehículos y propiedades. Los paquetes vigentes y sus precios se muestran en el sitio web y se confirman por escrito al momento de cotizar.</p>

<h2>3. Paquetes y precios</h2>
<ul>
<li><strong>Seguridad Básica</strong> — ₡299,000 (8,000 micras)</li>
<li><strong>Seguridad Full</strong> — ₡499,000 (16,000 micras)</li>
<li><strong>Seguridad Premium</strong> — ₡999,000 (27,000 micras)</li>
<li><strong>Máxima Protección</strong> — cotización personalizada (54,000 micras)</li>
</ul>
<p>Precios en colones costarricenses, sujetos a cambio sin previo aviso. Precio final confirmado antes de la instalación.</p>

<h2>4. Instalación</h2>
<p>La instalación incluye materiales y mano de obra. Tiempo típico: 2 a 4 horas por vehículo. Ofrecemos servicio en el taller o a domicilio (dentro del área metropolitana).</p>

<h2>5. Garantía</h2>
<p>Todos nuestros trabajos tienen garantía sobre el material y la instalación. Las películas son importadas con estándares internacionales. Detalles específicos se confirman al momento del servicio.</p>

<h2>6. Formas de pago</h2>
<p>Aceptamos efectivo, transferencia (SINPE Móvil) y tarjeta. El pago se realiza al finalizar la instalación salvo acuerdo diferente.</p>

<h2>7. Cancelaciones</h2>
<p>Las citas pueden cancelarse con al menos 24 horas de anticipación sin cargo. Cancelaciones con menos tiempo pueden generar cargo administrativo.</p>

<h2>8. Uso del asistente virtual Elena</h2>
<p>Elena es un asistente virtual potenciado por inteligencia artificial. Sus respuestas son informativas y los precios/disponibilidades finales se confirman con nuestro equipo humano.</p>

<h2>9. Propiedad intelectual</h2>
<p>El contenido del sitio web y materiales de Glass Soler son propiedad de Glass Soler. No pueden reproducirse sin autorización.</p>

<h2>10. Jurisdicción</h2>
<p>Estos términos se rigen por las leyes de la República de Costa Rica.</p>

<h2>11. Contacto</h2>
<p>WhatsApp: +506 6379 0438 | Email: <a href="mailto:allann.solis.94@gmail.com">allann.solis.94@gmail.com</a></p>
</body>
</html>"""


@app.route("/politica-privacidad")
@app.route("/privacidad")
@app.route("/privacy")
def privacidad():
    return PRIVACY_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/terminos")
@app.route("/terms")
def terminos():
    return TERMS_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/eliminar-datos", methods=["GET"])
def eliminar_datos():
    html = """<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Eliminación de datos — Glass Soler</title></head>
<body style="font-family:sans-serif;max-width:720px;margin:2rem auto;padding:1rem;line-height:1.6">
<h1>Eliminación de datos de usuario</h1>
<p>Para solicitar la eliminación de tus datos personales de Glass Soler:</p>
<ol>
<li>Envía un mensaje por WhatsApp al <strong>+506 6379 0438</strong></li>
<li>Asunto: <strong>"Eliminar mis datos"</strong></li>
<li>Incluye tu nombre completo y el número de teléfono registrado</li>
</ol>
<p>Procesaremos tu solicitud en un plazo máximo de 30 días y te confirmaremos por el mismo canal.</p>
<p>Alternativa: envía correo a <a href="mailto:allann.solis.94@gmail.com">allann.solis.94@gmail.com</a></p>
</body></html>"""
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


# ─────────────────────────────────────────────
# RUTAS — Meta Webhook (WhatsApp + Messenger + IG)
# ─────────────────────────────────────────────
@app.route("/meta/webhook", methods=["GET"])
def meta_webhook_verify():
    """Verificación del webhook de Meta (GET challenge)."""
    mode = request.args.get("hub.mode", "")
    token = request.args.get("hub.verify_token", "")
    challenge = request.args.get("hub.challenge", "")

    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        logger.info("Meta webhook verificado exitosamente")
        return challenge, 200
    logger.warning("Meta webhook verification failed: mode=%s", mode)
    return "Forbidden", 403


@app.route("/meta/webhook", methods=["POST"])
def meta_webhook_receive():
    """Recibe mensajes de WhatsApp, Messenger e Instagram via Meta webhook."""
    # Verificar firma
    signature = request.headers.get("X-Hub-Signature-256", "")
    raw_body = request.get_data()
    if META_APP_SECRET and not verificar_firma_meta(raw_body, signature):
        logger.warning("Meta webhook: firma inválida")
        return "Invalid signature", 403

    data = request.get_json(silent=True) or {}

    # Meta siempre envía un "object" field
    objeto = data.get("object", "")

    if objeto == "whatsapp_business_account":
        _procesar_whatsapp_webhook(data)
    elif objeto in ("page", "instagram"):
        _procesar_messenger_webhook(data, objeto)

    # Meta requiere 200 siempre
    return "OK", 200


def _procesar_whatsapp_webhook(data: dict) -> None:
    """Procesa mensajes entrantes de WhatsApp Business API."""
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])

            for msg in messages:
                msg_type = msg.get("type", "")
                telefono = msg.get("from", "")
                msg_id = msg.get("id", "")

                # Solo procesar mensajes de texto por ahora
                if msg_type == "text":
                    texto = msg.get("text", {}).get("body", "")
                elif msg_type == "interactive":
                    # Botones / listas
                    interactive = msg.get("interactive", {})
                    texto = (
                        interactive.get("button_reply", {}).get("title", "")
                        or interactive.get("list_reply", {}).get("title", "")
                    )
                elif msg_type in ("image", "audio", "video", "document"):
                    texto = f"[{msg_type} recibido] {msg.get('caption', '')}"
                else:
                    continue

                if not texto.strip():
                    continue

                # Obtener nombre del contacto
                contacts = value.get("contacts", [])
                nombre = ""
                if contacts:
                    profile = contacts[0].get("profile", {})
                    nombre = profile.get("name", "")

                logger.info("WhatsApp de %s (%s): %s", nombre or telefono, telefono[:6] + "***", texto[:50])

                id_usuario = _sanitize_id(f"wa_{telefono}")
                respuesta = obtener_respuesta(id_usuario, texto.strip(), "whatsapp", nombre)

                # Marcar como leído
                _marcar_leido_whatsapp(msg_id)

                # Responder
                enviar_whatsapp(telefono, respuesta)


def _marcar_leido_whatsapp(message_id: str) -> None:
    """Marca un mensaje de WhatsApp como leído."""
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        return

    def _mark():
        try:
            url = f"https://graph.facebook.com/{META_API_VERSION}/{META_PHONE_NUMBER_ID}/messages"
            requests.post(
                url,
                json={
                    "messaging_product": "whatsapp",
                    "status": "read",
                    "message_id": message_id,
                },
                headers={"Authorization": f"Bearer {META_ACCESS_TOKEN}"},
                timeout=5,
            )
        except Exception:
            pass

    threading.Thread(target=_mark, daemon=True).start()


def _procesar_messenger_webhook(data: dict, objeto: str) -> None:
    """Procesa mensajes de Facebook Messenger e Instagram DM."""
    canal = "instagram" if objeto == "instagram" else "facebook"

    for entry in data.get("entry", []):
        messaging_list = entry.get("messaging", [])

        for event in messaging_list:
            sender = event.get("sender", {})
            sender_id = sender.get("id", "")

            # Ignorar mensajes del propio page/bot
            if sender_id == META_PAGE_ID:
                continue

            message = event.get("message", {})
            if not message:
                continue

            texto = message.get("text", "")
            if not texto.strip():
                # Manejar attachments (stickers, images, etc.)
                attachments = message.get("attachments", [])
                if attachments:
                    att_type = attachments[0].get("type", "media")
                    texto = f"[{att_type} recibido]"
                else:
                    continue

            logger.info("%s de %s: %s", canal.upper(), sender_id[:8] + "***", texto[:50])

            id_usuario = _sanitize_id(f"{canal[:2]}_{sender_id}")

            # Intentar obtener nombre del usuario via API
            nombre = _obtener_nombre_meta(sender_id)

            respuesta = obtener_respuesta(id_usuario, texto.strip(), canal, nombre)

            # Responder via Messenger/IG
            enviar_messenger(sender_id, respuesta)


def _obtener_nombre_meta(user_id: str) -> str:
    """Intenta obtener el nombre del usuario via Graph API."""
    if not META_ACCESS_TOKEN:
        return ""
    try:
        url = f"https://graph.facebook.com/{META_API_VERSION}/{user_id}"
        resp = requests.get(
            url,
            params={"fields": "first_name,last_name", "access_token": META_ACCESS_TOKEN},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            first = data.get("first_name", "")
            last = data.get("last_name", "")
            return f"{first} {last}".strip()
    except Exception:
        pass
    return ""


# ─────────────────────────────────────────────
# RUTAS — Webhook genérico (n8n, Make, WATI, etc.)
# ─────────────────────────────────────────────
@app.route("/webhook", methods=["POST"])
def webhook_generico():
    """Webhook genérico para n8n, Make.com, WATI, Twilio, etc."""
    data = request.get_json(silent=True) or {}

    # Detectar canal del mensaje
    canal = (
        data.get("channel")
        or data.get("platform")
        or data.get("source")
        or "whatsapp"
    ).lower()

    # Extraer ID del usuario
    raw_id = (
        data.get("from")
        or data.get("sender")
        or data.get("phone")
        or data.get("userId")
        or data.get("user_id")
        or "anon"
    )

    # Extraer mensaje
    mensaje = (
        data.get("body")
        or data.get("message")
        or data.get("text")
        or data.get("content")
        or ""
    ).strip()

    if not mensaje:
        return jsonify({"error": "Mensaje vacío"}), 400

    if len(mensaje) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": "Mensaje muy largo"}), 400

    # Nombre del usuario si viene
    nombre = data.get("name") or data.get("contactName") or data.get("profile_name") or None

    id_usuario = _sanitize_id(f"{canal[:2]}_{raw_id}")
    respuesta = obtener_respuesta(id_usuario, mensaje, canal, nombre)

    logger.info("[%s][%s] → %s... | Elena: %s...", canal, raw_id, mensaje[:40], respuesta[:40])

    return jsonify({
        "reply": respuesta,
        "from": "elena_glass_soler",
        "channel": canal,
    })


# ─────────────────────────────────────────────
# RUTAS — Chat directo (pruebas)
# ─────────────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    """Endpoint de prueba directa."""
    try:
        data = request.get_json(silent=True) or {}
        mensaje = data.get("message") or data.get("mensaje") or data.get("body") or ""
        canal = data.get("channel", "web")
        id_usuario = _sanitize_id(data.get("userId", f"test-{uuid.uuid4().hex[:6]}"))

        if not mensaje.strip():
            return jsonify({"error": "Mensaje vacío"}), 400

        respuesta = obtener_respuesta(id_usuario, mensaje.strip(), canal)
        return jsonify({"reply": respuesta, "channel": canal})
    except Exception as e:
        logger.exception("Error en /chat: %s", e)
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# RUTAS — Citas
# ─────────────────────────────────────────────
@app.route("/citas", methods=["GET"])
def listar_citas():
    """Lista todas las citas."""
    estado = request.args.get("estado", "")
    if estado:
        filtradas = {k: v for k, v in citas.items() if v["estado"] == estado}
        return jsonify(filtradas)
    return jsonify(citas)


@app.route("/citas/<cita_id>", methods=["GET"])
def ver_cita(cita_id: str):
    cita = citas.get(cita_id)
    if not cita:
        return jsonify({"error": "Cita no encontrada"}), 404
    return jsonify(cita)


@app.route("/citas/<cita_id>/cancelar", methods=["POST"])
def cancelar_cita(cita_id: str):
    if cita_id in citas:
        citas[cita_id]["estado"] = "cancelada"
        logger.info("Cita %s cancelada", cita_id)
        return jsonify({"status": "cancelada", "cita_id": cita_id})
    return jsonify({"error": "Cita no encontrada"}), 404


@app.route("/citas/<cita_id>/completar", methods=["POST"])
def completar_cita(cita_id: str):
    if cita_id in citas:
        citas[cita_id]["estado"] = "completada"
        logger.info("Cita %s completada", cita_id)
        return jsonify({"status": "completada", "cita_id": cita_id})
    return jsonify({"error": "Cita no encontrada"}), 404


# ─────────────────────────────────────────────
# RUTAS — Horarios
# ─────────────────────────────────────────────
@app.route("/horarios", methods=["GET"])
def horarios():
    return jsonify({"horarios": obtener_horarios_disponibles()})


# ─────────────────────────────────────────────
# RUTAS — Administración
# ─────────────────────────────────────────────
@app.route("/reset/<id_usuario>", methods=["POST"])
def reset(id_usuario: str):
    clean_id = _sanitize_id(id_usuario)
    with _lock:
        conversaciones.pop(clean_id, None)
    return jsonify({"status": "reset", "userId": clean_id})


@app.route("/historial/<id_usuario>", methods=["GET"])
def historial(id_usuario: str):
    clean_id = _sanitize_id(id_usuario)
    return jsonify(conversaciones.get(clean_id, []))


@app.route("/stats", methods=["GET"])
def stats():
    """Estadísticas del bot."""
    total_citas = len(citas)
    confirmadas = len([c for c in citas.values() if c["estado"] == "confirmada"])
    completadas = len([c for c in citas.values() if c["estado"] == "completada"])
    canceladas = len([c for c in citas.values() if c["estado"] == "cancelada"])

    canales = {}
    for conv_id in conversaciones:
        prefijo = conv_id.split("_")[0] if "_" in conv_id else "otro"
        canales[prefijo] = canales.get(prefijo, 0) + 1

    return jsonify({
        "citas": {
            "total": total_citas,
            "confirmadas": confirmadas,
            "completadas": completadas,
            "canceladas": canceladas,
        },
        "conversaciones": {
            "total": len(conversaciones),
            "por_canal": canales,
        },
        "kb_paquetes": len(KB.get("paquetes", [])),
        "kb_faq": len(KB.get("faq", [])),
    })


@app.route("/kb", methods=["GET"])
def ver_kb():
    """Retorna la base de conocimiento actual."""
    return jsonify(KB)


@app.route("/kb/reload", methods=["POST"])
def recargar_kb():
    """Recarga la base de conocimiento desde el archivo JSON."""
    global KB
    KB = cargar_kb()
    logger.info("KB recargada: %d paquetes, %d FAQs", len(KB.get("paquetes", [])), len(KB.get("faq", [])))
    return jsonify({"status": "ok", "paquetes": len(KB.get("paquetes", [])), "faq": len(KB.get("faq", []))})


# ─────────────────────────────────────────────
# INICIO
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("GLASS_PORT", "5001"))

    logger.info("""
╔═══════════════════════════════════════════════════╗
║   Elena Bot — Glass Soler 🛡️                     ║
║   Multi-canal: WhatsApp + Facebook + Instagram    ║
╚═══════════════════════════════════════════════════╝

Servidor: http://localhost:%d

Endpoints:
  GET  /                  → Estado del bot
  POST /meta/webhook      → Meta Webhooks (WA + FB + IG)
  GET  /meta/webhook      → Meta Webhook Verify
  POST /webhook           → Webhook genérico (n8n/Make)
  POST /chat              → Prueba directa
  GET  /citas             → Listar citas
  POST /citas/<id>/cancelar   → Cancelar cita
  POST /citas/<id>/completar  → Completar cita
  GET  /horarios          → Horarios disponibles
  GET  /stats             → Estadísticas
  GET  /kb                → Ver base de conocimiento
  POST /kb/reload         → Recargar KB desde JSON
  POST /reset/<id>        → Reiniciar conversación
  GET  /historial/<id>    → Ver historial

Meta Config:
  Page ID:    %s
  Phone ID:   %s
  Verify:     %s
  API Token:  %s
  KB cargada: %d paquetes, %d FAQs
""", port, META_PAGE_ID, META_PHONE_NUMBER_ID or "NO CONFIGURADO",
    META_VERIFY_TOKEN, (META_ACCESS_TOKEN[:12] + "...") if META_ACCESS_TOKEN else "NO CONFIGURADO",
    len(KB.get("paquetes", [])), len(KB.get("faq", [])))

    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
