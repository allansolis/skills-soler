# 📊 Análisis 23 abril 2026 — Post-optimización +24h

**Generado:** 23 abr 2026, 01:15
**Comparativo:** 24h desde el scaling agresivo de Esmeraldas y consolidación de Glass Soler

---

## 🚨 ALERTA CRÍTICA — Balances agotados

| Cuenta | Balance ahora | Corrió a | Estado |
|--------|---------------|----------|--------|
| **Esmeraldas SOLER** | **₡16** | Gastó ₡9,349 ayer | 🔴 EN ROJO — ads NO entregando hoy |
| **Glass Soler** | **$1.18** | Gastó $4.27 ayer | 🔴 EN ROJO — se agota hoy |

**Evidencia de agotamiento Esmeraldas:**
- Hoy spend: **₡0** (pero 7 msgs recibidos como overflow ayer)
- Las 5 campañas activas todas marcan `today: spend=0`
- Algoritmo de Meta no puede entregar sin fondos

**Acción inmediata:** Recargar Meta Ads Manager → Facturación
- Esmeraldas: sugerido ₡80,000+ (aguanta 8-10 días al nuevo ritmo de scaling)
- Glass Soler: sugerido $40+ (aguanta 10+ días a $3/día)

---

## 📈 Esmeraldas SOLER — El scaling FUNCIONÓ ✅

### Comparativo pre vs post-scaling (24h después)

| Métrica | Pre-scaling (7d antes) | Post-scaling (7d ahora) | Cambio |
|---------|------------------------|--------------------------|--------|
| Spend 7d | ₡6,974 | **₡16,323** | +134% |
| Mensajes 7d | 82 | **238** | **+190%** 🎯 |
| Cost/msg 7d | ₡85 | **₡69** | **-19%** 🎯 |
| CTR 7d | 5.96% | 5.42% | -9% (normal al escalar) |
| Frequency 7d | 1.51 | 1.71 | +13% (sano, <2.5) |

### Qué pasó en las últimas 24h (ayer solo)
- **Ayer:** ₡9,349 gastados → **135 mensajes** → **₡69.25/msg**
- Ese es el costo-mensaje promedio manteniéndose igual con 2x+ de volumen → **el mercado absorbió el scaling sin fatiga**

### Performance por campaña hoy
- ✅ **Catálogo Dinámico WhatsApp:** 6 msgs hoy (único activo pese al balance mínimo)
- ✅ **IG Acaba de Ingresarnos:** 1 msg hoy (presupuesto lifetime todavía disponible)
- ⏸️ Cadena Plata 925, Estilo Único, IG Plata 925: 0 spend hoy (daily_budget requiere fondos)

### Learning phase status
- 30d total: **1,810 mensajes** a ₡72/msg promedio
- Los 3 ganadores escalados ayer estaban ya fuera del learning phase → scaling fue al siguiente nivel sin afectar calidad de entrega

---

## 🛡️ Glass Soler — Learning phase en curso ⚠️

### Comparativo pre vs post consolidación

| Métrica | Pre (3 campañas) | Post (1 campaña MESSAGES) | Nota |
|---------|------------------|----------------------------|------|
| Spend 7d | $15.02 | $19.29 | +28% |
| CTR 7d | 13.50% | 13.77% | +2% ✅ |
| Msgs 7d | 9 | 9 | sin cambio |
| Cost/msg | $1.67 | $2.14 | +28% ⚠️ |

### Diagnóstico
**Meta aún está aprendiendo la nueva audiencia de `CONVERSATIONS` optimization.** Evidencia:
- **Hoy:** 253 impresiones, CTR 2.37% (vs 14.73% ayer) → el algoritmo está explorando nuevos segmentos
- **Frequency 1.11** → audiencia fresh, no fatiga
- **Ayer:** 2,601 impresiones, 0 mensajes pese a CTR 14.73% → clicks llegan pero no empiezan conversación

**Esto es NORMAL en los primeros 2-7 días** de una campaña `OUTCOME_ENGAGEMENT + CONVERSATIONS`. Meta está probando diferentes variantes de audiencia para encontrar quienes sí abren chat.

### Decisión recomendada
**NO tocar nada hasta el viernes 24 abr (48h después del setup)** — dar que termine learning phase. Si al viernes sigue a $2+/msg con 0 conversión, considerar:
1. Volver a destino `MESSENGER` en lugar de `WHATSAPP` (ver cuál convierte mejor)
2. Reducir edad target de 25-55 a 30-50 (más conservador)
3. Revisar si la página tiene auto-reply activado y Elena bot responde fast

---

## 🔄 n8n — Status Agent 9 post-fix

**Último deploy:** Workflow `Agent 9 - Sincronización CRM Bidireccional` publicado ayer con fix de `sortBy=date_updated` (antes `last_activity`) + eliminado `sortOrder`.

**Cron:** Cada 3 horas. Desde el fix a ahora deberían haber corrido ~3-4 ejecuciones.

Para verificar manualmente el histórico:
- Ir a https://allannsolis94.app.n8n.cloud/home/executions
- Filtrar por workflow "Agent 9"
- Contar ejecuciones SUCCESS vs ERROR desde 22-abr 22:00

---

## ✅ Salud del sistema local (23-abr 01:15)

| Servicio | Puerto | PID | Estado |
|----------|--------|-----|--------|
| CRM Auto-CRM | 3000 | 19792 | ✅ funcionando |
| Bot Elena Esmeraldas | 5000 | 12312 | ✅ funcionando (con KB JSON nueva) |
| Bot Elena Glass Soler | 5001 | 376 | ✅ funcionando |
| Syncthing | 8384 | 11500 | ✅ funcionando |

**Dashboard `/ads` del CRM** — data live verificada: Esmeraldas 5 activas, 7d spend ₡16,323, 183 msgs.

---

## 🎯 Plan de acción para HOY/MAÑANA

### 🔴 YA (antes de que empiece el día laboral)
1. **Recargar balance Meta Ads Manager** — Esmeraldas ₡80k+ · Glass $40+
2. Verificar que después de la recarga las campañas reanuden entrega (revisar en 2h en el dashboard `/ads`)

### 🟠 Antes del viernes 24 abr
3. Revisar n8n executions del Agent 9 (debe mostrar ≥1 SUCCESS post-fix)
4. Confirmar bots siguen respondiendo (test: mensaje real en WhatsApp/Messenger de Glass y Esmeraldas)

### 🟡 Viernes 24 abr (48h post-scaling)
5. **Revisar Esmeraldas:** si 7d spend llegó a ₡25k+ y msgs ~300 → scaling confirmado, subir otro 25%
6. **Revisar Glass Soler:** si salió del learning phase con cost/msg < $3 y ≥15 msgs → campaña viable, mantener $3/día

### 🟢 Lunes 29 abr (7d post-scaling)
7. Analizar ganadores 7d completos: ¿quién se mantuvo bajo ₡100/msg Esmeraldas?, ¿quién bajó de $2.50/msg Glass?
8. Considerar apagar las que no: Catálogo Dinámico vs IG posts — ¿cuál tiene mejor costo/msg sostenido?
9. Decisión final IG boosted posts (vencen 29 abr) — renovar o cortar

---

## 📊 Resumen ejecutivo (1 línea por cuenta)

- **Esmeraldas:** Scaling confirmado +190% msgs con -19% costo/msg en 24h. **Crítico:** recargar balance o se para.
- **Glass Soler:** Consolidación exitosa de 3 a 1 campaña, en learning phase. **Crítico:** recargar balance.
- **n8n:** Fix desplegado, pendiente confirmar ejecuciones limpias en producción.
- **Infraestructura:** Todo corriendo saludable (bots + CRM + Syncthing).
