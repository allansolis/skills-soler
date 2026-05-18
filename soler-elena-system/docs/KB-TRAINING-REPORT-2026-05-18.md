# KB Training Report - 2026-05-18

_Generado automaticamente por `scripts/kb_trainer.py`_

## 1. Summary

- Conversaciones analizadas (total): **0**
- Mensajes totales: **0**
- Hot leads (score >= 70): **0**
- Handoffs disparados: **0**
- Conversaciones cold (score < 20): **0**
- Tiempo total analisis: **0.01s**

> **Aviso:** No hay conversaciones en `bots/data/conversations.db`. El reporte se genera vacio pero el pipeline corrio sin errores. Re-ejecuta cuando los bots hayan acumulado dialogos reales.

## 2. Top FAQs perdidas (por negocio)

Preguntas frecuentes del usuario que NO encuentran match (>= 0.55) en `kb.faq`.

_Sin preguntas no cubiertas detectadas (o sin datos suficientes)._

## 3. Objeciones recurrentes

Mensajes con cues negativos (caro / lo pensare / mas barato / etc.) que NO matchean objeciones existentes en `kb.objeciones`.

_Sin objeciones nuevas detectadas._

## 4. Productos/servicios mencionados sin match en KB

_Sin terminos huerfanos detectados (umbral: >=2 menciones, sim. < 0.7)._

## 5. Nuevas senales propuestas para scoring

Patrones regex que aparecen mas en conversaciones hot que en cold. Considerar agregar a `lead_scoring.SCORING_RULES`.

_Senales insuficientes; se requieren mas conversaciones hot vs cold._

## 6. Best practices conversacionales

### Patron en conversaciones exitosas (hot leads)

_Sin ejemplos: no hay hot leads aun._

### Patron en abandono (cold leads)

_Sin ejemplos: no hay conversaciones cold aun._

## 7. Acciones recomendadas (PRIORIZADAS)

### Top 5 cambios a hacer en KBs

_(Sin sugerencias con datos actuales.)_

### Top 3 reglas de scoring a agregar

_(Sin sugerencias con datos actuales.)_

### Top 3 mejoras al sistema

1. [sistema] Activar logging de conversaciones (DB vacia). Confirmar que los bots llaman `ConversationStore.append`.

---

_Reporte generado por `kb_trainer.py` en 0.01s._