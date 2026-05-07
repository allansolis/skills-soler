# 🔧 Status n8n — 7 mayo 2026

## ✅ Tests automáticos ejecutados

| Test | URL | Resultado |
|------|-----|-----------|
| n8n cloud salud | `/healthz` | **HTTP 200** ✅ |
| Webhook Esmeraldas | `/webhook/esmeraldas-soler` | **HTTP 200** + `"Workflow was started"` ✅ |
| Webhook Glass Soler | `/webhook/glass-soler` | **HTTP 200** + `"Workflow was started"` ✅ |
| Tunnel Cloudflare CRM | `disks-choice-berry-tail.trycloudflare.com` | **HTTP 200** ✅ |
| Bot Glass Soler local | `localhost:5001/chat` | **HTTP 200** + Elena responde con personalidad ✅ |
| Bot Esmeraldas local | `localhost:5000/chat` | **HTTP 200** + Elena responde con flujo de venta ✅ |
| Anthropic API | `api.anthropic.com` | **HTTP 200** (post-fix SSL Norton) ✅ |

## 🟢 Workflows confirmados activos

Por respuesta de los webhooks públicos:
- **Cerebro Marketing IA — Glass Soler** (webhook `/glass-soler`) → ACTIVO ✅
- **Cerebro Marketing IA — Esmeraldas SOLER** (webhook `/esmeraldas-soler`) → ACTIVO ✅

Estos son los 2 más críticos: reciben mensajes de WhatsApp/Messenger/IG vía Meta webhooks.

## 🟡 Workflows que no responden a `/webhook/*`

Los siguientes workflows NO tienen endpoint público porque usan **Schedule trigger** (cron), no webhook:
- Agent 7 — KB Updater Inteligente
- Agent 8 — Gestor de Inventario Catálogo
- Agent 9 — CRM Sync Bidireccional
- Agent 10 — Informe Ejecutivo Diario
- Optimizador de Campañas IA
- Informe de Inteligencia de Marketing
- Creador y estratega de campañas
- Sincronización rendimiento meta anuncios
- Automatizador principal de tuberías
- Meta Ads Performance Sync

**Para verificar estos:** hay que entrar al editor n8n y revisar pestaña "Executions" últimas 24-48h.

## ⚠️ Indicio de problema potencial

Los webhooks responden 200 pero **el log del bot Glass Soler local NO muestra requests de IPs externas** después de los disparos.

Eso significa que probablemente:
- n8n recibe el webhook ✅
- n8n procesa internamente (LLM, lógica, etc.) ✅
- n8n intenta llamar al bot local o CRM con URL VIEJA ❌
- La llamada falla silenciosamente
- n8n queda con `"Workflow was started"` pero sin completar el flow

### URLs que probablemente están desactualizadas en los workflows

| Lugar | URL vieja | URL nueva |
|-------|-----------|-----------|
| n8n → CRM | `http://localhost:3000/...` | `https://disks-choice-berry-tail.trycloudflare.com/...` |
| n8n → CRM | `https://multiple-ross-emerging-checked.trycloudflare.com/...` | `https://disks-choice-berry-tail.trycloudflare.com/...` |
| n8n → Bot Glass | `http://localhost:5001/...` | (necesita tunnel propio o llamar via CRM) |
| n8n → Bot Esmeraldas | `http://localhost:5000/...` | (necesita tunnel propio o llamar via CRM) |

## 🛠️ Para verificar manualmente (5 min en n8n UI)

### 1. Ir a https://allannsolis94.app.n8n.cloud/

### 2. Verificar status workflows
**Click "Executions" en menú lateral**
- Buscar ejecuciones de las últimas 24h
- Cuántas dicen "Success" vs "Error"
- Click en cualquier "Error" → ver qué nodo falló

### 3. Si Agent 9 CRM Sync sigue fallando 100%
Probablemente el nodo Zolutium API está OK (último fix aplicado), pero el nodo "Sincronizar con CRM local" tiene URL vieja. Editar:
- Workflow `Agent 9 - Sincronización CRM Bidireccional` (ID `FMqTp80qW1WJeqhO`)
- Click nodo "Sincronizar con CRM local" o similar
- En "URL" reemplazar `localhost:3000` o `multiple-ross-emerging-checked.trycloudflare.com` por:
  ```
  https://disks-choice-berry-tail.trycloudflare.com
  ```
- Save → Publicar

### 4. Repetir para todos los workflows con nodos HTTP a localhost
Lista de workflows con probable fix:
- Agent 7 (KB Updater)
- Agent 8 (Inventory)
- Agent 9 (CRM Sync) — ⚠️ prioridad alta
- Agent 10 (Daily Report)
- Cerebro Marketing IA Glass Soler — verificar si llama al bot
- Cerebro Marketing IA Esmeraldas — verificar si llama al bot

### 5. Webhook URL desde Meta para los bots

Los bots local/n8n reciben mensajes vía Meta webhooks. Hay que verificar que la URL configurada en Meta apunte al lugar correcto:

**Meta Developer Console → App Soler → Webhooks → Page**
- URL configurada actualmente: ¿cuál es?
- Debería ser: `https://disks-choice-berry-tail.trycloudflare.com/meta/webhook` (o el endpoint que use bot_glass.py)

Si cambió el tunnel, esa URL hay que actualizarla manualmente en:
- developers.facebook.com → app Soler → Productos → Webhooks → Pages → Edit subscription → URL nueva

## 📋 Plan de fix rápido (si Chrome extension reconecta)

Si la extensión de Claude se reconecta, puedo:

1. Abrir n8n.cloud
2. Listar workflows + estado real (success/error rate últimos 7d)
3. Editar nodos con URLs viejas (script-asisted)
4. Publicar cambios
5. Test E2E desde Meta hasta bot

Para conectar extensión:
- Chrome → icono extensiones (🧩) → Claude in Chrome → Sign in / Reconnect
- Probable que requiera autenticarse de nuevo en claude.ai

## 🎯 Resumen ejecutivo

✅ **Lo que funciona:**
- n8n cloud activo
- Webhooks Cerebro Marketing IA Glass + Esmeraldas reciben requests
- Bots locales responden con Anthropic API funcional
- Tunnel Cloudflare nuevo activo
- Catálogo Glass + product sets creados
- Cuenta Esmeraldas operando normal

🟡 **Lo que probablemente falla:**
- Workflows internos n8n con URLs viejas (no puedo verificar sin acceso al editor)
- Meta webhook URL en Developer Console (puede apuntar a tunnel viejo)

🔴 **Bloqueo principal:**
- Glass Soler `account_status=3` (UNSETTLED) — pagar factura desbloquea TODO

## 🔧 Si quieres que yo arregle URLs en n8n

Necesito una de estas:
- **Opción A:** Reactivar la extensión Chrome de Claude (5 seg desde el navegador)
- **Opción B:** Compartirme la API key de n8n (Settings → n8n API → Create new API key)
  - Con esa key puedo listar, editar y publicar workflows vía API directa

---

**Tests ejecutados:** 7 mayo 2026, ~04:35 AM
**Bots:** funcionando perfectos, Anthropic API conectado
**Acción usuario:** revisar n8n.cloud Executions y arreglar URLs
