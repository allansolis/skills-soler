# 📘 Operator Guide — Sistema Elena Soler Multi-bot

**Versión:** 2.0
**Última actualización:** 2026-05-18
**Para:** Allann Solís (operador principal)

---

## 🎯 ¿Qué hace este sistema?

Sistema multi-bot conversacional con IA (Claude Sonnet 4.5 + Haiku 4.5) que vende por WhatsApp/Messenger/Instagram para los 4 negocios del Grupo Soler:

1. 🛡️ **Glass Soler** — polarizado de seguridad vehicular
2. 💎 **Esmeraldas Soler** — joyería con esmeraldas naturales
3. 🚗 **Autos Soler** — compra-venta de vehículos
4. 🏘️ **Inversiones Soler** — asesoría inmobiliaria

Cada negocio tiene su propia "Elena" (asesora IA) con KB editable, scoring de leads, notificaciones en tiempo real y handoff automático a vendedor humano cuando detecta intención alta.

---

## 🚀 Cómo arranco el sistema en una PC nueva

```cmd
:: 1. Clonar repo
git clone https://github.com/allansolis/skills-soler.git
cd skills-soler\soler-elena-system

:: 2. Setup Python
pip install flask anthropic python-dotenv truststore pip-system-certs

:: 3. Setup CRM
cd ..\auto-crm
npm install --no-audit --no-fund
cd ..\soler-elena-system

:: 4. Copiar .env (pedir token a Allann)
copy .env.example C:\Users\Usuario\Desktop\"Bot glass soler"\.env

:: 5. Arrancar todo
scripts\start_ecosystem.bat
```

O manualmente (4 ventanas):
```cmd
python bots\bot.py           :: :5000 Esmeraldas
python bots\bot_glass.py     :: :5001 Glass
python bots\bot_autos.py     :: :5002 Autos
python bots\bot_inversiones.py :: :5003 Inversiones
```

Más:
```cmd
:: Watchdog (auto-restart bots caídos)
python scripts\watchdog.py

:: Cloudflare tunnel (CRM accesible desde n8n)
cloudflared tunnel --url http://localhost:3000

:: CRM
cd ..\auto-crm && npx next dev
```

---

## 🧠 Componentes del sistema

### Bots (4 servicios Flask)
| Bot | Puerto | KB | Page Meta |
|-----|--------|-----|-----------|
| Esmeraldas | 5000 | `kb_esmeraldas.json` | 797310113463115 |
| Glass | 5001 | `kb_glass_soler.json` | 860529027138846 |
| Autos | 5002 | `kb_autos.json` | 100123132505557 |
| Inversiones | 5003 | `kb_inversiones.json` | 796480326889963 |

### Módulos compartidos (todos los bots usan)
- `lead_scoring.py` — puntaje por señales (35 patrones regex)
- `lead_endpoints.py` — endpoints REST `/leads/*` en cada bot
- `notifications.py` — alerts multi-canal (Slack/Telegram/log)
- `conversation_store.py` — persistencia SQLite (sobrevive restarts)
- `model_router.py` — Haiku para mensajes simples, Sonnet para complejos
- `ab_testing.py` — experimentos A/B en saludos y respuestas

### Scripts
- `watchdog.py` — auto-restart bots cada 60s
- `auto_followup.py` — recovery de hot leads inactivos > 4h
- `deploy-pending-campaigns.py` — fire 6 campañas Meta cuando ADS token vuelva
- `extract-zolutium.py` — descargar config GoHighLevel cuando token vuelva
- `enhance-glass-kb.py` / `enhance-other-kbs.py` — agregar FAQs/objeciones
- `kb_trainer.py` — analyze conversations and suggest KB improvements

### CRM Next.js (puerto 3000)
- `/` — Home con KPIs + widget multi-business leads
- `/leads` — tabla hot leads con filtros
- `/leads-kanban` — kanban 7 columnas (NEW/WARM/HOT/HANDOFF + CONTACTED/WON/LOST manuales)
- `/analytics` — gráficos: trend, funnel, signals, peak hours, comparison
- `/ads` — Meta Ads dashboard live
- `/pipeline` — Deals tradicional CRM
- `/contacts` `/deals` `/conversations` `/activities` `/loyalty` `/reports` `/settings`

### n8n Cloud (https://allannsolis94.app.n8n.cloud)
- Webhooks activos: `/webhook/glass-soler`, `/webhook/esmeraldas-soler`
- Pendientes importar: `n8n-workflow-autos-soler.json`, `n8n-workflow-inversiones-soler.json`

---

## ⚡ Eventos automáticos del sistema

**Cuando un cliente envía mensaje al bot:**

1. n8n recibe webhook Meta → llama bot en localhost vía tunnel
2. Bot ejecuta:
   - `model_router.route_model()` — elige Haiku o Sonnet
   - `conversation_store.append()` — guarda turno user
   - `lead_endpoints.auto_score()` — scoring + posibles notificaciones
   - Claude API genera respuesta
   - `conversation_store.append()` — guarda turno assistant
3. Si score ≥ 70 → `notifications.notify_hot_lead()` (Slack/Telegram/log)
4. Si needs_handoff → `notifications.notify_handoff()` y `handoff_triggered=True`
5. Cliente recibe respuesta en su canal
6. Lead aparece en CRM `/leads` y `/leads-kanban` (auto-refresh 30-60s, SSE cada 5s opcional)

**Cuando un hot lead lleva 4h sin responder:**

1. `auto_followup.py --daemon` detecta inactividad
2. Envía mensaje de followup personalizado por negocio (template 1 o 2)
3. Si tras 2 intentos sigue sin respuesta → marca como "silencioso"

**Cuando un bot cae:**

1. `watchdog.py` detecta HTTP != 200 en GET /
2. Mata proceso en el puerto + relanza el script
3. Notifica vía Slack/log
4. Si falla 3 veces seguidas → alerta CRITICAL

---

## 🛠️ Tareas comunes del operador

### Ver hot leads pendientes
Abrir http://localhost:3000/leads-kanban

### Editar KB de un bot (sin reiniciar)
```bash
notepad knowledge-bases\kb_glass_soler.json
:: Hot-reload via API
curl -X POST -H "X-Webhook-Secret: $secret" http://localhost:5001/kb/reload
```

### Resetear conversación de un cliente
```bash
curl -X POST -H "X-Webhook-Secret: $secret" http://localhost:5001/reset/USER_ID
```

### Ver score de un usuario
```bash
curl -H "X-Webhook-Secret: $secret" http://localhost:5001/leads/score?user_id=USER_ID
```

### Exportar leads a CSV
```bash
curl -H "X-Webhook-Secret: $secret" "http://localhost:5001/leads/export?format=csv&min_score=50" -o leads-glass.csv
```

### Deploy 6 campañas Meta (cuando ADS token esté)
```bash
cd C:\Users\Usuario\Documents\skills-soler\soler-elena-system
python scripts\deploy-pending-campaigns.py              :: dry-run
python scripts\deploy-pending-campaigns.py --deploy    :: real
```

### Generar nuevo backup
```powershell
cd "C:\Users\Usuario\Documents\skills-soler"
$ts = Get-Date -Format "yyyyMMdd-HHmm"
git bundle create "C:\Users\Usuario\Backups\skills-soler\skills-soler-$ts.bundle" --all
tar -a -cf "C:\Users\Usuario\Backups\skills-soler\skills-soler-$ts.zip" -C "C:\Users\Usuario\Documents" skills-soler
```

---

## 🔑 Credenciales necesarias en .env

```env
:: Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-XXX
CLAUDE_MODEL=claude-sonnet-4-5-20250929

:: Meta App "Soler" — page messaging (genera en Graph Explorer)
META_ACCESS_TOKEN=EAFt...

:: Meta App "Soler Inversiones" — ads_management (en otra app)
META_ADS_TOKEN=EAA...

:: Zolutium (GoHighLevel)
ZOLUTIUM_API_KEY=pit-XXX

:: Webhook secret (compartido para auth interna)
WEBHOOK_SECRET=Ok2XkP56Q-...

:: Opcional - notificaciones
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TELEGRAM_BOT_TOKEN=1234567:ABC
TELEGRAM_CHAT_ID=987654

:: A/B testing
MODEL_ROUTER_ENABLED=true
MODEL_HAIKU=claude-haiku-4-5-20251001
MODEL_SONNET=claude-sonnet-4-5-20250929
```

---

## 🚨 Troubleshooting

| Problema | Causa probable | Fix |
|----------|----------------|-----|
| Bot tira `Connection error` | Norton AV TLS MITM | `pip install truststore pip-system-certs` |
| Bot 401 "No autorizado" | WEBHOOK_SECRET no coincide | Verificar `.env` y header `X-Webhook-Secret` |
| CRM HTTP 500 BusinessContext | Falta provider | Ya fixed (commit `e5cfd57a`) |
| Tunnel URL muerta | Cloudflare quick tunnel expirado | Restart `cloudflared tunnel --url http://localhost:3000` y actualizar `.env` |
| Token Meta "Session expired" | Token dura 1-2h en dev mode | Regenerar en Graph Explorer |
| Glass account_status=3 | Factura impaga | Pagar en Ads Manager Billing |
| Zolutium 401 | Token expirado | Regenerar en Private Integrations |
| Webhook Meta no responde | Verify token mismatch | `glass_soler_verify_2026` |

---

## 📊 KPIs a monitorear

| Métrica | Dónde | Target |
|---------|-------|--------|
| Hot leads/día (todos) | `/leads` | 10+ |
| Conversion rate (handoffs/total) | `/analytics` | 15-25% |
| Avg score | `/leads/stats` (cada bot) | 30+ |
| Bots uptime | `watchdog.py` log | 99%+ |
| Costo/mensaje promedio | `model_router.estimate_cost_savings()` | < $0.005 |

---

## 🎁 Lo que tenés disponible ahora

- ✅ 4 bots Elena 24/7 (con auto-restart)
- ✅ Lead scoring auto en cada mensaje
- ✅ Notificaciones Slack/Telegram cuando hot lead detectado
- ✅ Auto-followup 4h+ inactividad
- ✅ Model router 36% ahorro estimado
- ✅ CRM con kanban + tabla + analytics
- ✅ Campaign Pack 6 campañas listas para fire
- ✅ Brief diseñador 4 creativos
- ✅ IG plan + 10 posts verbatim para @inversionessoler
- ✅ n8n workflows importables Autos+Inversiones
- ✅ A/B testing framework
- ✅ Real-time SSE stream
- ✅ KB trainer (analyzes conversations and suggests improvements)
- ✅ SQLite persistence (sobrevive restarts)
- ✅ Backup automático local + Drive

---

## 🚧 Pendientes manuales (de Allann)

| # | Tarea | Bloquea |
|---|-------|---------|
| 1 | Habilitar Marketing API en app Soler | ADS token con `ads_management` |
| 2 | Regenerar `META_ADS_TOKEN` | Deploy campañas |
| 3 | Regenerar `ZOLUTIUM_API_KEY` | Extract Zolutium config |
| 4 | Pagar factura Glass | Reactivar cuenta Glass |
| 5 | Recargar saldo Esmeraldas + Autos | Reactivar campañas pausadas |
| 6 | Crear @inversionessoler en IG | Page Inversiones sin IG |
| 7 | Vincular @autossoler a page Autos | DM Autos por IG |
| 8 | Importar 2 workflows n8n (Autos+Inversiones) | Webhooks 404 |
| 9 | Configurar Slack/Telegram webhook | Notificaciones reales |
| 10 | Mandar brief diseñador para 4 creativos | Campañas Glass nuevas |

Cuando completés cualquiera, el watcher dispara automáticamente lo que dependa.

---

## 📞 Contactos del sistema

- **Repo:** https://github.com/allansolis/skills-soler
- **n8n cloud:** https://allannsolis94.app.n8n.cloud
- **CRM local:** http://localhost:3000
- **Tunnel actual:** ver `.env` `CRM_PUBLIC_URL`

---

**Mantenedor:** Allann Solís
**Sistema diseñado por:** Claude + Allann
**Fecha doc:** 2026-05-18
