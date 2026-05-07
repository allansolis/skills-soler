# 🎯 Plan de acción 22 abril — orden exacto de ejecución

## 🔴 CRITICAL (hoy, <30 minutos total)

### CRIT-1 · Crear Pixel Glass Soler (5 min)
**Por qué:** Sin pixel, Meta no puede optimizar conversaciones y no se pueden crear audiencias.

```bash
curl -X POST "https://graph.facebook.com/v25.0/act_1101364862188478/adspixels" \
  -d "name=Glass Soler - Pixel Seguridad" \
  -d "access_token=$META_ADS_TOKEN"
```
Luego activar Advanced Matching en Events Manager (UI): Origen de datos → Pixel → Configuración → Advanced Matching → Habilitar.

### CRIT-2 · Restaurar CAPI Esmeraldas Pixel `1644701100171663` (15 min)
**Por qué:** Pixel no ha disparado desde 9 abril. CAPI roto = decisiones a ciegas.

1. Ir a Events Manager → Pixel 1644701100171663 → Pestaña "Integraciones y fuentes"
2. Verificar que el canal CAPI sigue conectado (probablemente el token del bot expiró)
3. Enviar test event via:
```bash
curl -X POST "https://graph.facebook.com/v25.0/1644701100171663/events" \
  -d 'data=[{"event_name":"Lead","event_time":'$(date +%s)',"user_data":{"em":"'$(echo -n test@test.com | sha256sum | cut -d\  -f1)'"}}]' \
  -d "test_event_code=TEST12345" \
  -d "access_token=$META_ADS_TOKEN"
```
4. Si retorna `events_received: 1` → CAPI vivo. Conectar bot Elena para que dispare eventos reales `MessagingConversationStarted`.

### CRIT-3 · Fix n8n Agent 9 Zolutium (10 min)
**Por qué:** 100% de los workflows fallan, corren cada 15 min.

1. Ir a https://allannsolis94.app.n8n.cloud/workflow/FMqTp80qW1WJeqhO
2. Click en nodo "OBTENER Contactos Zolutium"
3. Regenerar credencial Zolutium:
   - Location ID: `CzqwqD6eS1JrCHQxdvy2`
   - API Key actual: `pit-0ea1a634-e80f-4f37-8949-798f99cb3eb3` (probablemente expirada)
   - Nueva: generar en Zolutium → Settings → Private Integrations → regenerar token
4. Actualizar credencial n8n `ZmDt7KNuTUndyGjC` con el nuevo token
5. Ejecutar manualmente → verificar Status 200

### CRIT-4 · Recargar balance ambas cuentas Meta (2 min)
- Glass Soler: $3.31 balance → 1 día a $3/día budget. Ir a Ads Manager → Facturación → Agregar fondos (sugerido $30 para 10 días)
- Esmeraldas: ₡8,652 → 2 días al ritmo actual. Recargar ₡50,000 (sugerido)

---

## 🟠 HIGH (esta semana, <2 horas total)

### HIGH-5 · Archivar 88 campañas pausadas Esmeraldas (10 min)
**Por qué:** Ruido en Ads Manager. Muchas son "Boosted Stories" viejas y tests fallidos.

```bash
# Listar pausadas
curl "https://graph.facebook.com/v25.0/act_1868510380157902/campaigns?fields=id,name&filtering=%5B%7B%22field%22%3A%22effective_status%22%2C%22operator%22%3A%22IN%22%2C%22value%22%3A%5B%22PAUSED%22%5D%7D%5D&limit=100&access_token=$META_ADS_TOKEN" > paused.json

# Archivar todas
python -c "
import json, urllib.request, urllib.parse, os
token=os.environ['META_ADS_TOKEN']
paused=json.load(open('paused.json'))['data']
for c in paused:
    data=urllib.parse.urlencode({'status':'ARCHIVED','access_token':token}).encode()
    urllib.request.urlopen(urllib.request.Request(f'https://graph.facebook.com/v25.0/{c[\"id\"]}', data=data, method='POST'))
    print(f'archived {c[\"id\"]}')
"
```

### HIGH-6 · Pausar Glass Soler "Aumento Seguidores" (1 min)
**Por qué:** PAGE_LIKES no genera conversaciones. Gastó $5.93 → 0 mensajes.

```bash
curl -X POST "https://graph.facebook.com/v25.0/120245957532150130" \
  -d "status=PAUSED" \
  -d "access_token=$META_ADS_TOKEN"
```

### HIGH-7 · Cloudflare tunnel → CRM local (5 min)
**Por qué:** n8n Cloud no puede alcanzar localhost. Los workflows de sync apuntan a http://localhost:3000 pero deben apuntar al URL público.

1. En Windows PowerShell:
```powershell
cloudflared tunnel --url http://localhost:3000
```
2. Copiar el URL `https://xxx.trycloudflare.com`
3. En n8n → cada workflow con nodo HTTP local → reemplazar `http://localhost:3000` por el URL público
4. Affected workflows: Agent 9 (CRM sync), Agent 7 (KB update), Agent 8 (inventory), Agent 10 (daily report)

### HIGH-8 · Vincular @glasssoler como Instagram Business Account (3 min)
**Por qué:** Sin vinculación, los anuncios no pueden salir en el feed de IG con la marca Glass Soler.

1. Ir a Meta Business Suite → Cuentas → Páginas → Glass Soler → Configuración
2. Agregar cuenta de IG → Seleccionar @glasssoler
3. Aceptar permisos

### HIGH-9 · Pausar campañas pausadas antiguas Glass Soler
Ya hay solo 2 campañas viejas activas (una pausar arriba). Queda Campaña de Apertura 4-18 TF Similares ($3/día, $9.09 7d, 6 msgs @ $1.51/msg). 

**Acción:** mantenerla ACTIVA 7 días más para comparar con la nueva MESSAGES. Decisión 29 abril.

---

## 🟡 MEDIUM (próximos 7-14 días)

### MED-10 · Migrar KB Esmeraldas de bot.py a JSON (30 min)
**Por qué:** Glass Soler ya tiene `kb_glass_soler.json` estructurado. Esmeraldas KB está hardcoded en SYSTEM_PROMPT dentro de bot.py. Eso:
- Impide que Agent 7 (KB Updater IA) pueda mejorarla automáticamente
- Dificulta actualizaciones (requiere edit de código Python)
- Rompe consistencia con arquitectura Glass

**Acción:** Crear `kb_esmeraldas.json` con misma estructura de Glass (negocio, contacto, horario, paquetes, faq, testimonios, meta_ads) y adaptar `bot.py` para cargarlo igual que `bot_glass.py`.

### MED-11 · Crear Custom Audiences cuando pixel esté vivo
Cuando CRIT-1 y CRIT-2 estén listos (24-48h después), crear:

**Glass Soler:**
- CA 1: Visitaron Facebook page últimos 90d
- CA 2: Engaged con cualquier ad últimos 180d
- CA 3: Mensajearon a la página últimos 30d
- LAL 1%: Basado en CA 3 (compradores-intención alta)

**Esmeraldas:**
- CA 4: Engagement con page IG últimos 90d
- CA 5: Añadieron a carrito últimos 30d (desde Catálogo)
- LAL 1%: Basado en CA 5 (compradores)

```bash
# Ejemplo API:
curl -X POST "https://graph.facebook.com/v25.0/act_1101364862188478/customaudiences" \
  -d "name=Glass Soler - Mensajeros 30d" \
  -d "subtype=ENGAGEMENT" \
  -d 'rule={"inclusions":{"operator":"or","rules":[{"event_sources":[{"id":"860529027138846","type":"page"}],"retention_seconds":2592000,"filter":{"operator":"and","filters":[{"field":"event","operator":"eq","value":"message"}]}}]}}' \
  -d "access_token=$META_ADS_TOKEN"
```

### MED-12 · Escalar "Cadena Plata 925 + Dije Esmeralda" Esmeraldas
**Por qué:** ₡26/msg 30d, frequency 1.11 — subir budget no fatiga. 

**Acción:** Subir daily_budget de ₡30 a ₡60 (+100%), proyección 60-120 msgs/mes adicionales.

```bash
# Encontrar adset_id
curl "https://graph.facebook.com/v25.0/120246610555910260/adsets?fields=id,daily_budget&access_token=$META_ADS_TOKEN"
# Luego actualizar:
curl -X POST "https://graph.facebook.com/v25.0/{ADSET_ID}" \
  -d "daily_budget=60" -d "access_token=$META_ADS_TOKEN"
```

### MED-13 · Desarrollar publicación de app "Soler Inversiones" para desbloquear creaciones
- Requiere Verificación de empresa en Meta Business Manager
- Documentación: RUC, estatutos, etc.
- Plazo Meta: 3-7 días
- Beneficio: desbloquea crear Custom Audiences, Ad Creatives desde API, Saved Audiences, Offline Events

---

## 🟢 LOW (backlog)

### LOW-14 · Agregar gráfico de tendencias al dashboard `/ads`
CRM muestra datos actuales. Agregar mini-chart de spend/msgs últimos 30 días con sparkline.

### LOW-15 · Webhook de alertas n8n
Cuando algún workflow falla 3x consecutivas → mandar alerta a Telegram/Slack del admin.

### LOW-16 · Backup diario de KB Glass Soler
`kb_glass_soler.json` actualmente solo en disco local. Commit a GitHub privado o backup a S3.

---

## 📌 Orden recomendado de ejecución hoy

1. CRIT-4 (recargar balance) → 2 min, evita que todo se pare mañana
2. CRIT-1 (pixel Glass) → 5 min, desbloquea siguientes pasos
3. CRIT-3 (fix Zolutium) → 10 min, restaura flujo de datos
4. CRIT-2 (CAPI Esmeraldas) → 15 min, requiere test event
5. HIGH-7 (cloudflare tunnel) → 5 min, mientras n8n se estabiliza
6. HIGH-6 (pausar page-likes Glass) → 1 min
7. HIGH-8 (vincular IG) → 3 min
8. HIGH-5 (archivar 88 pausadas) → 10 min

**Total: ~51 min → de 58/100 a ~82/100 en health score.**
