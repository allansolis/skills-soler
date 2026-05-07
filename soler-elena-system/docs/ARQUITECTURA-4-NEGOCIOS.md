# 🏗️ Arquitectura 4 Negocios Soler — Elena Multi-canal Multi-bot

**Fecha:** 7 mayo 2026
**Objetivo:** Que Elena responda WhatsApp + Instagram + Facebook para los 4 negocios desde n8n con Meta como puente único.

---

## 🎯 Los 4 negocios

| Negocio | Page ID | IG | Bot Local | KB | Catálogo Meta |
|---------|---------|----|-----------|----|---------------|
| 🛡️ **Glass Soler** | `860529027138846` | `@glasssoler` (24) | `bot_glass.py` :5001 | `kb_glass_soler.json` | `1670886954032475` (4) |
| 💎 **Esmeraldas Soler** | `797310113463115` | `@esmeraldas_soler` (3,129) | `bot.py` :5000 | `kb_esmeraldas.json` | `944718051249202` (30) |
| 🚗 **Autos Soler** | `100123132505557` | (sin IG) | `bot_autos.py` :5002 ⭐ NUEVO | `kb_autos.json` ⭐ | `955793357293894` (3) ⭐ |
| 🏘️ **Inversiones Soler** | `796480326889963` | (sin IG) | `bot_inversiones.py` :5003 ⭐ NUEVO | `kb_inversiones.json` ⭐ | (pendiente) |

---

## 🔄 Flujo de mensajes (objetivo)

```
Cliente envía mensaje en WhatsApp / Messenger / IG
   ↓
Meta envía webhook a n8n cloud
   ↓
n8n recibe en /webhook/{negocio}
   ↓
n8n identifica negocio (por page_id en payload)
   ↓
n8n llama al bot Elena del negocio correcto:
   ├─ Glass Soler → tunnel → :5001/webhook
   ├─ Esmeraldas → tunnel → :5000/webhook
   ├─ Autos Soler → tunnel → :5002/webhook
   └─ Inversiones → tunnel → :5003/webhook
   ↓
Bot Elena (con su KB JSON) procesa con Claude Sonnet 4.5
   ↓
Bot retorna respuesta a n8n
   ↓
n8n envía respuesta de vuelta a Meta (WA / Messenger / IG)
   ↓
Cliente recibe respuesta de Elena en su canal
```

---

## 📍 IDs Meta por negocio

### Glass Soler
- Page: `860529027138846`
- IG: `17841480061381569` (@glasssoler)
- WABA: `786597210574223` (compartido familia Soler)
- Phone Number ID: `777414378791556`
- Pixel: `4073809872916511`
- Catalog: `1670886954032475`
- Product Sets: Premium `1687488632441459`, Esenciales `4140736712892414`, Todos `1303614245207196`

### Esmeraldas Soler
- Page: `797310113463115`
- IG: `17841477346690740` (@esmeraldas_soler)
- WABA: `786597210574223` (compartido)
- Phone Number ID: `777414378791556`
- Pixel: `1644701100171663`
- Catalog: `944718051249202`

### Autos Soler ⭐ NUEVO
- Page: `100123132505557`
- IG: NO vinculado
- WABA: NO (necesita propio)
- Catalog: `955793357293894`
- Product Set "Últimos 3": `2026778511210048`
- Campaign: `6973745605052` (PAUSED)
- AdSet: `6973746161452` (PAUSED, ₡1,500/día)

### Inversiones Soler ⭐ NUEVO
- Page: `796480326889963` (0 fans, hay que crecer)
- IG: NO vinculado
- WABA: NO
- Catalog: (pendiente crear)

---

## 🤖 Bots Elena (4 instancias)

| Bot | Puerto | Personalidad | KB |
|-----|--------|--------------|-----|
| `bot_glass.py` | 5001 | Glass Soler 🛡️ — polarizado seguridad | 4 paquetes, 13 FAQs |
| `bot.py` | 5000 | Esmeraldas SOLER 💎 — joyería | 5 productos, 5 FAQs, 4 objeciones |
| `bot_autos.py` | 5002 | Autos Soler 🚗 — compra-venta vehículos | 4 servicios, 5 tipos vehículos, 5 objeciones |
| `bot_inversiones.py` | 5003 | Inversiones Soler 🏘️ — inmobiliaria | 5 servicios, 5 tipos inversión, 5 objeciones |

**Características comunes:**
- Modelo Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- truststore inject (fix Norton AV MITM)
- KB hot-reloadable via POST `/kb/reload`
- Endpoints `/`, `/stats`, `/chat`, `/webhook`, `/kb/reload`
- WEBHOOK_SECRET para auth

---

## ⚙️ Plan de implementación n8n (paso a paso)

### Paso 1: Tunnel Cloudflare expandido
Actualmente: `https://disks-choice-berry-tail.trycloudflare.com` → solo CRM (3000)

**Necesitas tunnels separados para cada bot:**
```bash
# Tunnel para los 4 bots simultáneamente (named tunnel mejor que quick)
cloudflared tunnel create soler-bots
cloudflared tunnel route dns soler-bots glass.tunnel.tudominio.com  # → :5001
cloudflared tunnel route dns soler-bots esmeraldas.tunnel.tudominio.com  # → :5000
cloudflared tunnel route dns soler-bots autos.tunnel.tudominio.com  # → :5002
cloudflared tunnel route dns soler-bots inversiones.tunnel.tudominio.com  # → :5003
```

**Alternativa quick** (sin DNS): 4 quick tunnels separados.

### Paso 2: Crear/actualizar workflows n8n

#### Workflow Master "Soler Hub" (recomendado)
**Trigger:** Webhook único `https://allannsolis94.app.n8n.cloud/webhook/soler-hub`

**Pasos del workflow:**
1. Webhook recibe payload Meta (incluye page_id, mensaje, sender)
2. Switch node por page_id:
   - `860529027138846` → Glass Soler
   - `797310113463115` → Esmeraldas
   - `100123132505557` → Autos
   - `796480326889963` → Inversiones
3. HTTP Request al bot correspondiente:
   - URL: `https://{negocio}.tunnel.tudominio.com/webhook`
   - Method: POST
   - Body: payload Meta normalizado
   - Headers: `X-Webhook-Secret: {secret}`
4. Respuesta del bot → Send back a Meta via Graph API

#### Workflows actuales (ya existen)
- **Cerebro Marketing IA Glass Soler** — `/webhook/glass-soler` (200 OK ✅)
- **Cerebro Marketing IA Esmeraldas** — `/webhook/esmeraldas-soler` (200 OK ✅)
- **Crear nuevos:**
  - Cerebro Marketing IA Autos Soler — `/webhook/autos-soler`
  - Cerebro Marketing IA Inversiones Soler — `/webhook/inversiones-soler`

### Paso 3: Configurar Meta Webhooks por page

**En developers.facebook.com → App Soler → Productos → Webhooks → Pages:**

Para cada página suscribir a estos campos:
- `messages` (WhatsApp)
- `messaging_postbacks` (Messenger)
- `messaging_optins`
- `message_deliveries`
- `message_reads`
- `messaging_handovers`

URLs por negocio:
| Negocio | Webhook URL |
|---------|-------------|
| Glass Soler | `https://allannsolis94.app.n8n.cloud/webhook/glass-soler` |
| Esmeraldas | `https://allannsolis94.app.n8n.cloud/webhook/esmeraldas-soler` |
| Autos | `https://allannsolis94.app.n8n.cloud/webhook/autos-soler` (crear) |
| Inversiones | `https://allannsolis94.app.n8n.cloud/webhook/inversiones-soler` (crear) |

### Paso 4: Suscribir páginas a la app Soler

Vía API o Meta Business Suite, asegurar que las 4 pages estén suscritas a la app `25746921918314942` (Soler) con esos 6 campos messaging.

### Paso 5: Vincular IG a pages que faltan
- Autos Soler (100123132505557): vincular @autossoler como Business IG
- Inversiones Soler (796480326889963): vincular IG (crear cuenta si no existe)

---

## 📦 Archivos generados HOY (resumen)

### Knowledge Bases (KBs)
- `kb_glass_soler.json` (existía)
- `kb_esmeraldas.json` (existía)
- `kb_autos.json` ⭐ NUEVO
- `kb_inversiones.json` ⭐ NUEVO

### Bots Python
- `bot_glass.py` (existía, fix truststore + Sonnet 4.5)
- `bot.py` (existía, fix truststore + Sonnet 4.5)
- `bot_autos.py` ⭐ NUEVO (puerto 5002)
- `bot_inversiones.py` ⭐ NUEVO (puerto 5003)

### Catálogos Meta
- Glass Soler: `1670886954032475` con 4 productos + 3 product sets
- Esmeraldas: `944718051249202` con 30 productos (existía)
- Autos Soler: `955793357293894` ⭐ NUEVO con 3 vehículos + product set "Últimos 3"
- Inversiones: pendiente

### Campañas Meta
- Glass Soler "Robo Viral": existente, $0.61/msg
- Glass Soler 3 nuevas (Antes/Después, Familia, DPA): listas en `auto-fix-glass.py` para activar tras pago factura
- **Autos Soler** ⭐ NUEVO: Campaign `6973745605052` + AdSet `6973746161452` (PAUSED) — multi-canal Messenger+IG, ₡1,500/día, audiencia compradores auto

---

## 🚦 Estado actual de cada negocio

### 🛡️ Glass Soler
- Bot: ✅ funcionando :5001
- Catálogo: ✅ 4 productos
- Campaña activa: Robo Viral ($0.61/msg en 30d)
- ⚠️ Cuenta UNSETTLED — pagar factura
- Pendiente: contenido IG (24 followers, 0 posts)

### 💎 Esmeraldas Soler
- Bot: ✅ funcionando :5000 con KB JSON
- Catálogo: ✅ 30 productos
- 5 campañas activas, 2,234 msgs/mes, ₡76/msg
- Account ACTIVE
- ⚠️ Balance bajo (₡4,636) — recargar pronto

### 🚗 Autos Soler ⭐
- Bot: ✅ creado :5002 (no arrancado aún)
- Catálogo: ✅ 3 vehículos demo (URLs Unsplash temp — reemplazar con fotos reales)
- Campaña: ✅ creada PAUSED (Messenger+IG, ₡1,500/día)
- Page: 442 fans (la más grande de los 4)
- ⚠️ Sin IG vinculado, sin WABA, sin posts orgánicos
- **Acciones pendientes:**
  1. Recargar saldo `act_2385776465260628` (₡15,000 mín)
  2. Subir 3 posts orgánicos (1 por vehículo)
  3. Crear 3 ads referenciando esos posts
  4. Vincular IG @autossoler (si existe) o crearla
  5. Vincular WABA propio para Autos

### 🏘️ Inversiones Soler ⭐
- Bot: ✅ creado :5003 (no arrancado aún)
- Catálogo: pendiente
- Campañas: ninguna
- Page: 0 fans (necesita arrancar de cero)
- **Acciones pendientes:**
  1. Page necesita contenido + crecer fans antes de campañas
  2. Crear catálogo de "tipos inversión"
  3. Vincular WABA + IG

---

## 🔧 Quick start: arrancar los 4 bots

```powershell
cd "C:\Users\Usuario\Desktop\Bot glass soler"

# Bot Glass (5001)
start "Glass" /MIN cmd /c "python bot_glass.py > bot_glass.log 2>&1"

# Bot Esmeraldas (5000)
start "Esmeraldas" /MIN cmd /c "python bot.py > bot_esmeraldas.log 2>&1"

# Bot Autos (5002) ⭐ NUEVO
start "Autos" /MIN cmd /c "python bot_autos.py > bot_autos.log 2>&1"

# Bot Inversiones (5003) ⭐ NUEVO
start "Inversiones" /MIN cmd /c "python bot_inversiones.py > bot_inversiones.log 2>&1"

# Verificar
timeout 10
curl http://localhost:5000/
curl http://localhost:5001/stats
curl http://localhost:5002/
curl http://localhost:5003/
```

---

## 📋 Checklist completo del usuario

### 🔴 Crítico (HOY)
- [ ] Pagar factura Glass Soler en Meta Ads Manager
- [ ] Recargar saldo Esmeraldas (₡60,000)
- [ ] Recargar saldo Autos Soler `act_2385776465260628` (₡15,000)
- [ ] Regenerar token Zolutium (Settings → Private Integrations)

### 🟠 Esta semana
- [ ] Vincular @autossoler como Business IG a la page Autos
- [ ] Crear cuenta IG @inversionessoler y vincular
- [ ] Subir 3 posts orgánicos Autos Soler (uno por vehículo)
- [ ] Reemplazar URLs Unsplash del catálogo Autos por fotos reales
- [ ] Crear 2 workflows n8n nuevos: Cerebro Marketing IA Autos + Inversiones
- [ ] Configurar webhooks Meta para las 4 pages

### 🟡 Próximas 2 semanas
- [ ] Setup tunnels named para los 4 bots (en lugar de quick)
- [ ] Crear catálogo Inversiones (tipos de inversión + propiedades destacadas)
- [ ] Plan de contenido orgánico Autos + Inversiones (1 post/día mín)
- [ ] Vincular WABAs propios para Autos e Inversiones (separar de Glass/Esmeraldas)

### 🟢 Futuro
- [ ] Verificación empresa Meta para desbloquear Custom Audiences en todos
- [ ] Dashboard CRM extendido con pestaña "Autos" y "Inversiones"
- [ ] Migrar los 4 bots a producción (gunicorn en lugar de Flask dev)

---

## 💰 Proyección 90 días con todos los bots activos

| Negocio | Msgs/mes actual | Proyectado 90d | Nuevo revenue/mes |
|---------|-----------------|----------------|-------------------|
| Glass Soler | 101 | 600-900 | ₡15-20M |
| Esmeraldas | 2,234 | 3,000-3,500 | ₡8-10M (mantener) |
| Autos Soler | 0 | 200-400 | ₡40-80M (ticket alto) |
| Inversiones | 0 | 50-100 | ₡100M+ (ticket muy alto) |
| **TOTAL** | 2,335 | **3,850-4,900** | **₡165-210M/mes** |

**Inversión total Meta Ads requerida:** ~₹350-500/mes ($700-1,000)
**ROAS conservador estimado:** 30-40x

---

## 🎯 Acción más crítica HOY

**Arrancar los 2 bots nuevos** para que ya estén funcionando localmente:
```powershell
cd "C:\Users\Usuario\Desktop\Bot glass soler"
python bot_autos.py > bot_autos.log 2>&1
# (en otra terminal)
python bot_inversiones.py > bot_inversiones.log 2>&1
```

Después de eso, **activar los 2 workflows n8n** para cerrar el loop completo de Meta → bots → respuesta.
