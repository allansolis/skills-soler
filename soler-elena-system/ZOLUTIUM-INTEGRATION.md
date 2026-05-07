# 🔗 Zolutium (GoHighLevel) Integration Guide

**Estado actual:** Token expirado, integración pendiente regen.

Esta guía documenta TODA la información que se sabe sobre la integración de Zolutium con el sistema Elena, para que cuando regeneres el token puedas extraer la KB completa.

---

## 📋 Credenciales actuales

| Item | Valor |
|------|-------|
| **Location ID** | `CzqwqD6eS1JrCHQxdvy2` |
| **Base URL** | `https://services.leadconnectorhq.com` |
| **API Version** | `2021-07-28` |
| **API Key (expirada)** | `pit-0ea1a634-e80f-4f37-8949-798f99cb3eb3` |
| **Secret ID** | `pit-3fa9ba99-e18d-4db4-9379-049faf0bbb56` |
| **Integration name** | "Soler (Privado)" |

---

## 🔄 Cómo regenerar el token

1. Ir a Zolutium dashboard
2. **Settings → Private Integrations**
3. Buscar la integración "Soler (Privado)" (o crear nueva si no existe)
4. Click **"Regenerate token"** o crear nueva con scopes:
   - `contacts.readonly`, `contacts.write`
   - `conversations.readonly`, `conversations.write`
   - `opportunities.readonly`, `opportunities.write`
   - `locations.readonly`
   - `customFields.readonly`, `customFields.write`
   - `tags.readonly`, `tags.write`
   - `pipelines.readonly`
5. Copiar el token (empieza con `pit-`)
6. Actualizar `.env`: `ZOLUTIUM_API_KEY=pit-NUEVO-TOKEN-AQUI`

---

## 🎯 Cosas que se sabe del agente Elena en Zolutium

Según historial del proyecto, Elena en Zolutium era el agente principal con estas características:

| Atributo | Valor |
|----------|-------|
| **Plataforma** | Zolutium (GoHighLevel) |
| **Modelo LLM original** | OpenAI GPT 4.1 |
| **Modo** | Piloto automático |
| **Canales** | SMS + IG + 4 canales más |
| **Total contactos asignados** | 1,267 (al 22 abril 2026) |

**Otros agentes en la misma cuenta:**
- Asistente de Ventas Online o Ecommerce
- IA Asistente de Agendamientos de Citas
- Allann IA
- Ink Puntual (Apagado)

**Bases de Conocimiento:**
- "Soler" (creada 7 abril 2026)
- 2 bases de conocimiento adicionales

---

## 🤖 Migración Elena Zolutium → Bots locales (este sistema)

Este repo **ya tiene** Elena reimplementada como 4 bots Python que reemplazan/complementan al Elena de Zolutium:

| Bot local | Equivalente Zolutium | Mejoras vs original |
|-----------|----------------------|---------------------|
| `bot.py` (Esmeraldas) | Elena en Zolutium SOLER KB | KB JSON editable, hot-reload, modelo Claude Sonnet 4.5 |
| `bot_glass.py` | (no existía) | KB con 4 paquetes y 13 FAQs específicos polarizado |
| `bot_autos.py` | (no existía) | KB con 4 servicios y tipos de vehículos |
| `bot_inversiones.py` | (no existía) | KB inmobiliaria con 5 tipos de inversión |

---

## 📥 Datos a extraer de Zolutium (cuando token vuelva)

Cuando regeneres el token, ejecutar este script para extraer todo:

```python
# extract-zolutium.py
import truststore
truststore.inject_into_ssl()
import json, urllib.request, os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.environ['ZOLUTIUM_API_KEY']
LOC = os.environ['ZOLUTIUM_LOCATION_ID']
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

def get(path):
    req = urllib.request.Request(f'https://services.leadconnectorhq.com/{path}')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Version', '2021-07-28')
    req.add_header('User-Agent', UA)
    req.add_header('Accept', 'application/json')
    return json.loads(urllib.request.urlopen(req, timeout=20).read())

# 1. Custom fields (para mapear a KBs)
fields = get(f'locations/{LOC}/customFields')
print(f"Custom fields: {len(fields.get('customFields', []))}")
with open('zolutium-custom-fields.json', 'w') as f:
    json.dump(fields, f, indent=2, ensure_ascii=False)

# 2. Tags
tags = get(f'locations/{LOC}/tags')
print(f"Tags: {len(tags.get('tags', []))}")
with open('zolutium-tags.json', 'w') as f:
    json.dump(tags, f, indent=2, ensure_ascii=False)

# 3. Pipelines + stages
pipes = get(f'opportunities/pipelines?locationId={LOC}')
print(f"Pipelines: {len(pipes.get('pipelines', []))}")
with open('zolutium-pipelines.json', 'w') as f:
    json.dump(pipes, f, indent=2, ensure_ascii=False)

# 4. Calendars (citas)
cals = get(f'calendars/?locationId={LOC}')
print(f"Calendars: {len(cals.get('calendars', []))}")
with open('zolutium-calendars.json', 'w') as f:
    json.dump(cals, f, indent=2, ensure_ascii=False)

# 5. Workflows / automations
wfs = get(f'workflows/?locationId={LOC}')
print(f"Workflows: {len(wfs.get('workflows', []))}")
with open('zolutium-workflows.json', 'w') as f:
    json.dump(wfs, f, indent=2, ensure_ascii=False)

# 6. Snippets / templates
snippets = get(f'locations/{LOC}/templates')
print(f"Snippets: {len(snippets.get('templates', []))}")
with open('zolutium-snippets.json', 'w') as f:
    json.dump(snippets, f, indent=2, ensure_ascii=False)

# 7. Sample contactos (primeros 100)
contacts = get(f'contacts/?locationId={LOC}&limit=100')
print(f"Contactos sample: {len(contacts.get('contacts', []))}")
print(f"Total contactos: {contacts.get('meta', {}).get('total')}")
with open('zolutium-contacts-sample.json', 'w') as f:
    json.dump(contacts, f, indent=2, ensure_ascii=False)

# 8. Sample conversaciones (últimas 50)
convs = get(f'conversations/search?locationId={LOC}&limit=50')
print(f"Conversaciones sample: {len(convs.get('conversations', []))}")
with open('zolutium-conversations-sample.json', 'w') as f:
    json.dump(convs, f, indent=2, ensure_ascii=False)

print("\n✅ Extracción completa. Archivos guardados en directorio actual.")
```

Save como `extract-zolutium.py` y ejecutar: `python extract-zolutium.py`

---

## 🔁 Sync Zolutium ↔ Bots locales

### Opción A: Sync via n8n (recomendado)
Workflow "Agent 9 - Sincronización CRM Bidireccional" debería sincronizar:
- Contactos Zolutium → CRM local
- Conversaciones Zolutium → bots locales
- Pipeline Zolutium → CRM local

**Nota:** Este workflow estaba fallando 100% (ver `docs/N8N-STATUS-7MAY.md`). Fix aplicado en parámetros sortBy/sortOrder pero no verificado en producción.

### Opción B: Migrar Elena de Zolutium → 100% local
Pasos:
1. Pausar agente Elena en Zolutium (Settings → AI Agents → Elena → Disable)
2. Actualizar webhooks de SMS/IG/etc. en Zolutium para apuntar a bots locales (vía tunnel Cloudflare)
3. Activar bots locales (Glass, Esmeraldas, Autos, Inversiones)
4. Validar que las conversaciones siguen llegando

Este sistema (`soler-elena-system/`) está diseñado para reemplazar Elena de Zolutium con ventajas:
- Modelo más nuevo (Sonnet 4.5 vs GPT 4.1)
- KBs editables sin tocar código
- Específico por negocio (no Elena genérica)
- Costo más bajo (Anthropic vs Zolutium AI)

---

## 🎓 Bases de Conocimiento — Diferencia Zolutium vs este sistema

### En Zolutium (modelo viejo)
- KB "Soler" (creada 7 abril 2026)
- KB se editaba en UI de Zolutium
- Compartida entre múltiples agentes
- Versionado limitado

### En este sistema (modelo nuevo)
- 4 KBs JSON separadas (`kb_glass_soler.json`, `kb_esmeraldas.json`, `kb_autos.json`, `kb_inversiones.json`)
- Editables con cualquier text editor
- Versionadas en git (cada cambio queda en historial)
- Hot-reload sin reiniciar bot: `POST /kb/reload`
- Estructura mejor diseñada (productos + flujo + objeciones + identidad + reglas)
- Específicas por negocio

**Para migrar contenido de KB Zolutium "Soler" a JSON:**

1. Extraer custom fields y snippets vía API (script arriba)
2. Identificar respuestas modelo / FAQs en `zolutium-snippets.json`
3. Mapear a campos correspondientes en cada KB JSON:
   - Snippets de saludo → `flujo_venta[paso_1].ejemplos`
   - Snippets de pago → `formas_pago.{metodo}.frase`
   - Snippets de objeciones → `objeciones[].respuesta`
   - Datos del negocio → `negocio.{descripcion,tagline,etc}`

---

## 📌 Estado al 7 mayo 2026

- ❌ Token Zolutium expirado (4 intentos a la API devolvieron 401)
- ✅ Bots locales funcionando con KBs nuevas (no dependen de Zolutium)
- ✅ Estructura JSON documentada en `knowledge-bases/`
- ⏳ Pendiente extracción config Zolutium para enriquecer KBs con datos históricos

---

**Cuando regeneres el token, comparte el resultado y procedo con la extracción + integración automática.**
