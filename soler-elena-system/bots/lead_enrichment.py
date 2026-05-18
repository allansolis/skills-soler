"""
Lead Enrichment — Extrae datos estructurados de mensajes del usuario.

Detecta y persiste:
- Nombre completo
- Telefono (CR formato 8 digitos o internacional)
- Email
- Vehiculo (marca + modelo + ano para Glass/Autos)
- Presupuesto (USD/CRC)
- Ubicacion (canton/ciudad CR)
- Tipo de propiedad (para Inversiones: apartamento/casa/terreno)
- Intencion (compra/venta/info)

Persistencia: data/leads_enriched.json clave compuesta business:user_id.

Uso:
    from lead_enrichment import enrich_lead

    enriched = enrich_lead(user_id='abc', message='Me llamo Pedro Soto, mi tel 88884444, tengo un Toyota Corolla 2018', business='glass_soler')
    # Returns: {'nombre': 'Pedro Soto', 'telefono': '88884444', 'vehiculo': {'marca': 'Toyota', 'modelo': 'Corolla', 'ano': '2018'}}
"""
import os
import re
import json
import threading
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
ENRICHED_FILE = DATA_DIR / "leads_enriched.json"

_lock = threading.Lock()


# --- Regex patterns ---

NAME_PATTERNS = [
    r'(?:me llamo|mi nombre es|soy)\s+([A-ZÁ-Ú][a-záéíóúñ]{2,15}(?:\s+[A-ZÁ-Ú][a-záéíóúñ]{2,15}){0,3})',
    r'^([A-ZÁ-Ú][a-záéíóúñ]{2,15}\s+[A-ZÁ-Ú][a-záéíóúñ]{2,15})\s*,?\s*(?:hola|saludos|buenas)',
]

PHONE_PATTERNS = [
    # CR (8 digits, may have country code)
    r'\b(?:\+?506[\s-]?)?(\d{4}[\s-]?\d{4})\b',
    r'\b(?:tel|telefono|movil|cel|whatsapp|wa)[\s.:]*([\+\d\s-]{8,15})',
]

EMAIL_PATTERN = r'\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b'

# Vehiculos comunes en CR
VEHICLE_BRANDS = [
    'toyota', 'honda', 'nissan', 'mazda', 'hyundai', 'kia', 'chevrolet', 'ford',
    'mitsubishi', 'subaru', 'suzuki', 'chery', 'geely', 'byd', 'jac', 'volkswagen',
    'audi', 'bmw', 'mercedes', 'lexus', 'isuzu', 'dodge', 'jeep', 'fiat', 'renault',
    'peugeot', 'ram', 'gmc', 'mini'
]
VEHICLE_PATTERN = (
    r'\b(' + '|'.join(VEHICLE_BRANDS) + r')\s+'
    r'([A-Z][a-z]{2,15}|\b\w{3,15}\b)'  # modelo
    r'(?:\s+([12]\d{3}))?'  # ano opcional
)

# Presupuesto: detecta "X mil", "X k", "$X", "Xmil colones"
BUDGET_PATTERNS = [
    r'\$\s*(\d{1,3}(?:[,.]?\d{3})*)\s*(?:k|mil|million|millones)?\b',
    r'\b(\d{2,4})\s*(?:mil|k)\s*(?:colones|crc|dolares|usd)?\b',
    r'\b(?:presupuesto|maximo|hasta|tengo)\s+(?:de\s+)?(?:\$\s*)?(\d{1,3}(?:[,.]?\d{3})+)',
    r'\busd\s*(\d+(?:[,.]?\d+)?)\s*(?:k|mil)?\b',
]

# Locations CR
CR_LOCATIONS = [
    'san jose', 'escazu', 'santa ana', 'heredia', 'cartago', 'alajuela', 'curridabat',
    'desamparados', 'tibas', 'moravia', 'guadalupe', 'sabanilla', 'san pedro', 'rohrmoser',
    'tamarindo', 'jaco', 'manuel antonio', 'montezuma', 'nosara', 'samara', 'liberia',
    'la fortuna', 'monteverde', 'limon', 'puerto viejo', 'puntarenas', 'guanacaste',
    'lindora', 'pozos', 'belen', 'pavas', 'la sabana', 'multiplaza'
]
LOCATION_PATTERN = r'\b(' + '|'.join(CR_LOCATIONS) + r')\b'

# Tipo propiedad (Inversiones)
PROPERTY_TYPES = [
    'apartamento', 'apto', 'casa', 'terreno', 'lote', 'condominio', 'townhouse',
    'penthouse', 'finca', 'comercial', 'oficina', 'local', 'bodega'
]
PROPERTY_PATTERN = r'\b(' + '|'.join(PROPERTY_TYPES) + r')\b'

# Intencion
INTENT_PATTERNS = {
    'comprar': r'\b(?:comprar|adquirir|conseguir|me interesa|quiero|busco)\b',
    'vender': r'\b(?:vender|liquidar|salir de)\b',
    'invertir': r'\b(?:invertir|inversion|renta|roi|rentabilidad|flip)\b',
    'info': r'\b(?:info|informacion|datos|catalogo|enseneme|muestreme)\b',
    'cotizar': r'\b(?:cotizacion|cotizar|presupuesto|precio|cuanto cuesta)\b',
    'agendar': r'\b(?:agendar|cita|visita|reunion|cuando puede)\b',
}


def _normalize_phone(phone_str: str) -> str:
    """Normaliza a 8 digitos CR."""
    digits = re.sub(r'[^\d]', '', phone_str)
    if digits.startswith('506'):
        digits = digits[3:]
    return digits if len(digits) == 8 else phone_str


def _load_enriched() -> dict:
    if not ENRICHED_FILE.exists():
        return {}
    try:
        return json.loads(ENRICHED_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {}


def _save_enriched(data: dict) -> None:
    ENRICHED_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def extract_fields(message: str) -> dict:
    """Extrae todos los campos del mensaje. Returns dict con campos que detectó."""
    if not message:
        return {}

    result = {}
    msg_low = message.lower()

    # Nombre
    for pattern in NAME_PATTERNS:
        m = re.search(pattern, message, re.IGNORECASE)
        if m:
            name_raw = m.group(1).strip()
            # Capitalizar palabras
            result['nombre'] = ' '.join(w.capitalize() for w in name_raw.split())
            break

    # Telefono
    for pattern in PHONE_PATTERNS:
        m = re.search(pattern, message)
        if m:
            phone = _normalize_phone(m.group(1))
            if len(phone) == 8:
                result['telefono'] = phone
                break

    # Email
    m = re.search(EMAIL_PATTERN, message)
    if m:
        result['email'] = m.group(1).lower()

    # Vehiculo
    m = re.search(VEHICLE_PATTERN, msg_low)
    if m:
        result['vehiculo'] = {
            'marca': m.group(1).capitalize(),
            'modelo': m.group(2).capitalize() if m.group(2) else None,
            'ano': m.group(3) if m.group(3) else None,
        }

    # Presupuesto
    for pattern in BUDGET_PATTERNS:
        m = re.search(pattern, msg_low, re.IGNORECASE)
        if m:
            amount_str = m.group(1).replace(',', '').replace('.', '')
            try:
                amount = int(amount_str)
                # Detectar moneda
                currency = 'CRC' if any(c in msg_low for c in ['colon', 'crc', 'mil colon']) else \
                          'USD' if any(c in msg_low for c in ['dolar', 'usd', '$']) else 'unknown'
                result['presupuesto'] = {'amount': amount, 'currency': currency, 'raw': m.group(0)}
                break
            except ValueError:
                continue

    # Location
    m = re.search(LOCATION_PATTERN, msg_low)
    if m:
        result['ubicacion'] = m.group(1).title()

    # Property type (para Inversiones)
    m = re.search(PROPERTY_PATTERN, msg_low)
    if m:
        result['tipo_propiedad'] = m.group(1).lower()

    # Intencion
    intentions = []
    for intent, pattern in INTENT_PATTERNS.items():
        if re.search(pattern, msg_low):
            intentions.append(intent)
    if intentions:
        result['intencion'] = intentions

    return result


def enrich_lead(user_id: str, message: str, business: str) -> dict:
    """
    Extrae datos del mensaje y los MERGEA con el lead existente.
    Returns el lead enriquecido completo.
    """
    new_fields = extract_fields(message)

    with _lock:
        all_leads = _load_enriched()
        key = f"{business}:{user_id}"

        existing = all_leads.get(key, {
            'business': business,
            'user_id': user_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': None,
            'fields': {}
        })

        # Merge: solo overwrite si new_fields tiene valor (no nulificar)
        for k, v in new_fields.items():
            if v:
                # Si es lista (intencion), append unique
                if k == 'intencion' and isinstance(existing['fields'].get('intencion'), list):
                    combined = list(set(existing['fields']['intencion'] + v))
                    existing['fields']['intencion'] = combined
                else:
                    existing['fields'][k] = v

        existing['updated_at'] = datetime.now(timezone.utc).isoformat()
        all_leads[key] = existing
        _save_enriched(all_leads)

    return existing


def get_enriched(user_id: str, business: str) -> dict:
    """Returns lead enriquecido o {}."""
    with _lock:
        all_leads = _load_enriched()
        return all_leads.get(f"{business}:{user_id}", {})


def list_enriched(business: str = None) -> list:
    """Returns lista de leads enriquecidos."""
    with _lock:
        all_leads = _load_enriched()
        if business:
            return [v for v in all_leads.values() if v.get('business') == business]
        return list(all_leads.values())


def search_by_phone(phone: str) -> list:
    """Busca por telefono normalizado."""
    phone_norm = _normalize_phone(phone)
    results = []
    with _lock:
        all_leads = _load_enriched()
        for lead in all_leads.values():
            if lead.get('fields', {}).get('telefono') == phone_norm:
                results.append(lead)
    return results


def search_by_name(name: str) -> list:
    """Busca por nombre (substring case-insensitive)."""
    name_low = name.lower()
    results = []
    with _lock:
        all_leads = _load_enriched()
        for lead in all_leads.values():
            lead_name = lead.get('fields', {}).get('nombre', '')
            if name_low in lead_name.lower():
                results.append(lead)
    return results


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("=== Self-test lead_enrichment ===\n")

    test_messages = [
        ("Hola me llamo Pedro Soto, mi tel es 8888-4444, tengo un Toyota Corolla 2018 en Escazu", "glass_soler", "test1"),
        ("Hola soy Maria Fernandez maria.fdz@gmail.com, busco apartamento en Santa Ana, presupuesto USD 250000", "inversiones_soler", "test2"),
        ("Hola, mi nombre Carlos. Quiero invertir, tengo 50 mil dolares para flip", "inversiones_soler", "test3"),
        ("Hola buen dia, manejo un Honda Civic 2020", "glass_soler", "test4"),
        ("8765-1234", "autos_soler", "test5"),
    ]

    for msg, biz, uid in test_messages:
        print(f"USER: {msg}")
        enriched = enrich_lead(uid, msg, biz)
        print(f"  Fields: {json.dumps(enriched['fields'], ensure_ascii=False, indent=2)}\n")

    print(f"\nTotal enriched: {len(list_enriched())}")
    print(f"Enriched Glass: {len(list_enriched('glass_soler'))}")
    print(f"\nBuscar Pedro: {search_by_name('pedro')}")
    print(f"\nBuscar por phone 88884444: {search_by_phone('88884444')}")
