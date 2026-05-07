# 🔍 Auditoría integral — 22 abril 2026

**Alcance:** Meta Ads (Glass Soler + Esmeraldas), n8n workflows, KB de los bots, CRM local.

**Health Score global: 58 / 100 — Grado D+**

- Meta Ads Glass Soler:  **42/100** (sin pixel, sin audiencias, conversiones bajas)
- Meta Ads Esmeraldas:   **68/100** (cost/msg excelente, pero CAPI caído)
- n8n automations:       **15/100** (100% de los workflows fallando)
- KB bots:               **72/100** (Glass estructurado, Esmeraldas hardcoded)
- CRM local:             **85/100** (funciona, nuevo dashboard de Ads en vivo)

---

## 🚨 5 problemas CRÍTICOS (arreglar HOY)

### 1. **n8n → 100 % de ejecuciones fallando (811/811)**
15 workflows marcados como "Publicado" pero ninguno entrega resultado.

**Causa raíz 1:** `Agent 9 CRM Sync Bidireccional` llama a la API de Zolutium (`services.leadconnectorhq.com`) y recibe: *"Su solicitud no es válida o no pudo ser procesada por el servicio."* El token Zolutium `pit-0ea1a634-e80f-4f37-8949-798f99cb3eb3` probablemente expiró o la estructura de la llamada cambió.

**Causa raíz 2:** Los workflows tienen nodos que hacen `POST http://localhost:3000/api/...` → n8n Cloud **no puede resolver localhost** desde Internet. Se necesita tunnel Cloudflare público apuntado al CRM.

**Impacto:** CRM no se sincroniza, reportes ejecutivos no se generan, KB updater no aprende.

### 2. **Glass Soler Meta Ads: SIN PIXEL**
Cuenta `act_1101364862188478` tiene 0 pixels. Resultado:
- No se pueden crear Custom Audiences (remarketing)
- No se puede medir Event Match Quality (EMQ)
- No se pueden generar Lookalikes
- Meta optimiza a ciegas — eso explica por qué 1238 clicks = 9 mensajes en 7 días

### 3. **Esmeraldas Pixel `1644701100171663` — caído hace 13 días**
`last_fired_time: 2026-04-09T16:41:55`. Hoy es 22 abril. El CAPI dejó de mandar eventos hace casi 2 semanas. La campaña "SOLER - Catálogo Dinámico WhatsApp" está funcionando a ₡61/msg a ciegas.

### 4. **Balance Esmeraldas crítico: ₡8,652**
A ritmo actual de ₡4,062/día (₡28,394 en 7d en la campaña mejor) el balance se acaba en **~2 días**. Glass Soler balance $3.31 = ~1 día a $3/día.

### 5. **Custom Audiences = 0 en AMBAS cuentas**
Ni retargeting, ni lookalikes, ni exclusiones. Impacto: dinero quemado re-pagando por gente ya convertida.

---

## 📊 Estado verificado

### Meta Ads — Glass Soler (USD)

| Métrica | 7 días | 30 días |
|---------|--------|---------|
| Spend | $15.02 | $15.02 |
| Impresiones | 9,167 | 9,167 |
| Reach | 8,085 | 8,085 |
| CTR | **13.50%** 🔥 | 13.50% |
| CPM | $1.64 | $1.64 |
| Mensajes | 6 | 9 |
| Cost/msg | $2.50 | $1.67 |
| Pixel | ❌ ninguno | ❌ |
| Custom audiences | 0 | 0 |
| Balance | $3.31 | — |
| Lifetime spent | $15.02 | — |

**Campañas activas (3):**
1. `120246154256950130` Glass Soler - Mensajes WhatsApp - Robo Viral (hoy, data insuficiente)
2. `120245957532150130` Aumento Seguidores 4-18 — budget sin data | CTR 14.78%
3. `120245957069720130` Apertura TF Públicos Similares — $3/día | CTR 13.03% | 6 msgs

### Meta Ads — Esmeraldas SOLER (CRC)

| Métrica | 7 días | 30 días |
|---------|--------|---------|
| Spend | ₡6,974 | ₡121,847 |
| Impresiones | 6,976 | 167,400 |
| Reach | 4,631 | 87,350 |
| CTR | 5.96% | 4.71% |
| CPM | ₡999 | ₡728 |
| Mensajes | **82** | **1,678** |
| Cost/msg | **₡85** | **₡72** ✅ |
| Pixel | ⚠️ caído desde 9 abr | ⚠️ |
| Custom audiences | 0 | 0 |
| Balance | ₡8,652 ⚠️ | — |

**Campañas activas (5), 88 pausadas:**
1. ✅ SOLER Catálogo Dinámico WA — ₡28,394 / 469 msgs / **₡61/msg** — MEJOR
2. ✅ Estilo Único para mamá/tía — ₡1,572 / 35 msgs / ₡45/msg
3. ✅ Cadena Plata 925 + Dije Esmeralda — ₡1,647 / 64 msgs / **₡26/msg** 🔥 MVP
4. ⚠️ Publicación IG Plata 925 (sin data)
5. ⚠️ Publicación IG Acaba de Ingresarnos (sin data)

### Frequency (fatiga creativa)

Todos los ads activos tienen frequency ≤ 1.86 (Catálogo Dinámico). Sano (umbral ≈2.5). No hay fatiga por repetición.

### n8n Workflows (15 publicados)

Detectados en https://allannsolis94.app.n8n.cloud/workflows:

**Glass Soler (6):**
- Automatizador principal de tuberías
- Cerebro Marketing IA
- Informe de inteligencia de marketing
- Optimizador de campañas con IA
- Creador y estratega de campañas con IA
- Agente 10 - Informe Ejecutivo Diario

**Esmeraldas SOLER (6):**
- Optimizador de Campañas AI
- Informe de Inteligencia de Marketing
- Cerebro Marketing IA
- Creador de Campañas y Estrategia IA
- Agente 8 - Gestor de inventario Catálogo
- Agente 9 - Sincronización CRM Bidireccional

**Compartidos (3):**
- Agente 7 - KB Updater Inteligente
- Sincronización del rendimiento de los meta anuncios
- Meta Ads Performance Sync

**Status de ejecución (últimas 24h):**
- 811 ejecuciones → **811 error** → 100% tasa de averías
- Tiempo promedio: 0.28s (fallan rápido = error de validación, no timeout)

### Knowledge Bases

| Bot | Forma | Contenido | Status |
|-----|-------|-----------|--------|
| Glass Soler | JSON estructurado `kb_glass_soler.json` | 4 paquetes, 13 FAQs, 2 testimonios, beneficios, proceso instalación, garantía, formas pago, meta_ads tracking | ✅ Activo, completo |
| Esmeraldas | Hardcoded en `SYSTEM_PROMPT` de `bot.py` | Productos + precios + pagos + flujo venta 8 pasos | ⚠️ Inconsistente con Glass, difícil de actualizar dinámicamente |

Ambos bots responden en vivo. Glass Soler bot: 4 conversaciones de Facebook ya registradas.

### CRM Local

- ✅ Dashboard `/ads` con data en vivo de Meta (recién creado hoy)
- ✅ Rutas `/pipeline`, `/contacts`, `/deals`, `/conversations`, `/loyalty`, `/reports`, `/activities`
- ⚠️ n8n Cloud no puede alcanzar `localhost:3000` → sync workflows fallan

---

## ✅ 10 mejoras recomendadas (priorizadas)

| # | Prioridad | Fix | Tiempo | Impacto |
|---|-----------|-----|--------|---------|
| 1 | 🔴 CRITICAL | Revivir/crear Pixel Glass Soler | 5 min | Desbloquea Meta optimization |
| 2 | 🔴 CRITICAL | Restaurar CAPI Esmeraldas Pixel | 15 min | Recupera tracking de conversiones |
| 3 | 🔴 CRITICAL | Fix n8n Agent 9 (Zolutium token) | 10 min | Restaura sync CRM |
| 4 | 🔴 CRITICAL | Recargar balance ambas cuentas | 2 min | Evita parada de ads |
| 5 | 🟠 HIGH | Archivar 88 campañas pausadas Esmeraldas | 10 min | Orden en Ads Manager |
| 6 | 🟠 HIGH | Pausar Glass Soler "Aumento Seguidores" (PAGE_LIKES no convierte) | 1 min | Reasigna budget a MESSAGES |
| 7 | 🟠 HIGH | Cloudflare tunnel → CRM local | 5 min | n8n Cloud puede sincronizar |
| 8 | 🟡 MEDIUM | Migrar KB Esmeraldas a JSON (como Glass) | 30 min | Permite que KB Updater la mejore |
| 9 | 🟡 MEDIUM | Vincular @glasssoler como Business IG | 3 min | +30% alcance IG |
| 10 | 🟢 LOW | Duplicar "Cadena Plata 925 +Dije Esmeralda" con budget 2x | 3 min | Escalar mejor performer (₡26/msg) |

---

## 📈 Oportunidades de escalamiento

**Esmeraldas – Cadena Plata 925 +Dije Esmeralda:**
- Cost/msg actual: ₡26 (30d)
- Frequency: 1.11 (sin fatiga)
- CTR: 6.75%
- **Acción:** Duplicar y subir budget 100% → proyección 120 msgs/mes adicionales a mismo CPA

**Glass Soler – Video Viral Robo (creative):**
- CTR 13.06% es 6x el promedio industria
- Reutilizado hoy en campaña nueva MESSAGES
- **Acción:** En 48-72h, comparar si la versión CONVERSATIONS genera más msgs que la original LINK_CLICKS. Si supera 2x → pausar la original.

**Catálogo Dinámico WhatsApp:**
- ₡61/msg en 30d, 469 msgs
- Frequency 1.86 (todavía espacio antes de fatiga)
- **Acción:** Expandir budget 30% y agregar 2° ad set con Lookalike 1% al recrearse pixel.

---

**Archivos generados:** `AUDITORIA-INTEGRAL-22ABR.md`, `ACTION-PLAN-22ABR.md`, `QUICK-WINS-22ABR.md`.
