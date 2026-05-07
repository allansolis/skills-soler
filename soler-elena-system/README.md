# 🤖 Soler Elena System — Multi-bot multi-canal IA

**Sistema completo de agente conversacional Elena para los 4 negocios del grupo Soler:**
- 🛡️ Glass Soler (polarizado de seguridad)
- 💎 Esmeraldas Soler (joyería con esmeraldas)
- 🚗 Autos Soler (compra-venta vehículos)
- 🏘️ Inversiones Soler (asesoría inmobiliaria)

Conecta WhatsApp + Facebook Messenger + Instagram Direct vía Meta Webhooks → n8n cloud → bot Elena del negocio correspondiente → Claude Sonnet 4.5 → respuesta de venta.

---

## 📁 Estructura

```
soler-elena-system/
├── README.md                    ← este archivo
├── .env.example                 ← template variables entorno
├── bots/                        ← 4 bots Python Flask
│   ├── bot.py                   ← Esmeraldas (puerto 5000)
│   ├── bot_glass.py             ← Glass Soler (puerto 5001)
│   ├── bot_autos.py             ← Autos Soler (puerto 5002) ⭐
│   └── bot_inversiones.py       ← Inversiones Soler (puerto 5003) ⭐
├── knowledge-bases/             ← KBs JSON editables
│   ├── kb_glass_soler.json      ← 4 paquetes, 13 FAQs
│   ├── kb_esmeraldas.json       ← 5 productos, flujo 9 pasos
│   ├── kb_autos.json            ← 4 servicios, 5 tipos vehículos ⭐
│   └── kb_inversiones.json      ← 5 servicios, 5 tipos inversión ⭐
├── scripts/                     ← Scripts auxiliares
│   ├── auto-fix-glass.py        ← Activar fixes Glass post-pago factura
│   ├── connect-catalog.py       ← Conectar catálogos a pages
│   ├── start_ecosystem.bat      ← Arrancar todo en Windows
│   ├── stop_ecosystem.bat       ← Detener todo
│   └── refresh-meta-token.bat   ← Helper refresh token
├── meta-config/                 ← IDs Meta (campañas, catálogos)
│   ├── autos_campaign.json
│   └── campaign_ids_glass.json
└── docs/                        ← 17 documentos estratégicos
    ├── ARQUITECTURA-4-NEGOCIOS.md          ← Plan maestro arquitectura
    ├── AUDITORIA-GLASS-5MAY.md             ← Auditoría Glass + plan
    ├── IG-CONTENT-PLAN-30D.md              ← Plan editorial IG 4 sem
    ├── BRIEF-DISENADOR.md                  ← Brief freelance
    ├── ADS-COPY-DPA.md                     ← Copy 4 ads DPA Glass
    ├── HOOKS-VARIANTES-ROBO-VIRAL.md       ← 5 hooks anti-fatiga
    ├── PLAYBOOK-SEMANA-1.md                ← Día por día Glass
    ├── N8N-STATUS-7MAY.md                  ← Estado workflows
    ├── ANALISIS-5MAY.md                    ← Comparativo post 12d
    ├── ANALISIS-23ABR.md                   ← Análisis post-scaling
    ├── AUDITORIA-INTEGRAL-22ABR.md         ← Auditoría inicial
    ├── ACTION-PLAN-22ABR.md                ← 16 fixes priorizados
    ├── QUICK-WINS-22ABR.md                 ← 8 fixes <15min
    ├── FIXES-APLICADOS-22ABR.md            ← Fixes ronda 1
    ├── OPTIMIZACION-FULL-22ABR.md          ← Optimización total
    ├── PRODUCTION_LIVE.md                  ← Estado producción
    └── SYNCTHING-SETUP.md                  ← Setup sincronización 3 PCs
```

---

## 🚀 Quick start (en una PC nueva)

### 1. Clonar repo
```bash
git clone https://github.com/allansolis/skills-soler.git
cd skills-soler/soler-elena-system
```

### 2. Setup Python
```bash
pip install flask anthropic python-dotenv truststore pip-system-certs
```

### 3. Crear `.env`
```bash
cp .env.example .env
# Editar .env con tus tokens reales
```

### 4. Arrancar los 4 bots
```bash
python bots/bot.py            # Esmeraldas en :5000
python bots/bot_glass.py      # Glass en :5001
python bots/bot_autos.py      # Autos en :5002
python bots/bot_inversiones.py # Inversiones en :5003
```

O usar el batch script Windows:
```cmd
scripts\start_ecosystem.bat
```

### 5. Verificar
```bash
curl http://localhost:5000/  # Esmeraldas
curl http://localhost:5001/  # Glass
curl http://localhost:5002/  # Autos
curl http://localhost:5003/  # Inversiones
```

---

## 🔄 Flujo de mensajes producción

```
Cliente envía mensaje (WhatsApp / Messenger / IG)
    ↓
Meta envía webhook a n8n cloud
    ↓
n8n recibe en /webhook/{negocio} y procesa
    ↓
n8n llama al bot Elena del negocio (vía tunnel Cloudflare):
    ├─ Glass Soler → :5001/webhook
    ├─ Esmeraldas → :5000/webhook
    ├─ Autos Soler → :5002/webhook
    └─ Inversiones → :5003/webhook
    ↓
Bot lee KB JSON + envía a Claude Sonnet 4.5
    ↓
Bot devuelve respuesta a n8n
    ↓
n8n responde a Meta vía Graph API
    ↓
Cliente recibe respuesta de Elena
```

Ver `docs/ARQUITECTURA-4-NEGOCIOS.md` para el plan completo.

---

## 📝 Bug crítico Windows — Norton AV TLS MITM

**Síntoma:** Bot tira `Connection error` al llamar a Anthropic API.

**Causa:** Norton AV intercepta TLS y reemplaza certificado de api.anthropic.com con uno propio. Python no confía en el root de Norton.

**Fix incluido en cada bot:**
```python
import truststore
truststore.inject_into_ssl()
```

Esto hace que Python use el Windows Certificate Store (que sí confía en Norton).

**Requiere:** `pip install truststore pip-system-certs`

---

## 🎨 Editar KB de un negocio

Las KBs son JSON. Para agregar productos / FAQs / objeciones:

1. Editar el archivo correspondiente: `knowledge-bases/kb_{negocio}.json`
2. Hot-reload sin reiniciar bot:
   ```bash
   curl -X POST -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
        http://localhost:{puerto}/kb/reload
   ```

Ejemplo agregar nuevo paquete a Glass:
```json
{
  "paquetes": [
    ...,
    {
      "nombre": "Premium Plus",
      "precio": "₡1,200,000",
      "micras": 32000,
      "descripcion": "Versión mejorada del Premium"
    }
  ]
}
```

Después: `curl -X POST -H "X-Webhook-Secret: $secret" http://localhost:5001/kb/reload`

---

## 🔧 Troubleshooting

| Problema | Solución |
|----------|----------|
| Bot tira "Connection error" | `pip install truststore && pip install pip-system-certs` |
| `account_status: 3` Glass | Pagar factura Meta Ads Manager |
| Token Meta expirado | Regenerar en Graph Explorer (cada 1-2h) |
| Token Zolutium "Invalid" | Regenerar en Zolutium → Settings → Private Integrations |
| n8n Agent 9 falla | Ver `docs/N8N-STATUS-7MAY.md` para fix de URLs |
| No responde el bot | Verificar `WEBHOOK_SECRET` en .env |

---

## 📊 Estado actual (7 mayo 2026)

| Negocio | Bot | KB | Catálogo | Campaña Meta |
|---------|-----|-----|----------|---------------|
| Glass Soler | ✅ | 4 paquetes | ✅ 4 productos + 3 product sets | ⏸️ Cuenta UNSETTLED, pagar factura |
| Esmeraldas | ✅ | 5 productos | ✅ 30 productos | ✅ 5 activas, ₡76/msg |
| Autos Soler | ✅ ⭐ | 4 servicios | ✅ 3 vehículos demo | ⏸️ PAUSED, recargar saldo |
| Inversiones | ✅ ⭐ | 5 servicios | ⚠️ pendiente | ⏸️ Sin campañas |

---

## 📞 Contactos del sistema

- **Repo principal:** https://github.com/allansolis/skills-soler
- **n8n cloud:** https://allannsolis94.app.n8n.cloud
- **CRM local:** http://localhost:3000 (skills/auto-crm)

---

**Versión:** 1.0 · **Fecha:** 7 mayo 2026 · **Mantenedor:** Allann Solís
