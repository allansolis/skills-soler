# Auditoría: Glass vs Esmeraldas — ¿Por qué Esmeraldas "no convierte"?

> Fecha: 2026-05-19
> Datos: últimos 30 días Meta Ads + estado actual CRM

## 🎯 TL;DR — La premisa estaba al revés

**Esmeraldas trae 12x MÁS mensajes que Glass y es 3x MÁS BARATO por mensaje.** El problema no son las campañas — es lo que pasa **después** del mensaje.

## 📊 Comparativa 30 días

| Métrica | Glass Soler | Esmeraldas Soler | Diferencia |
|---------|------------:|-----------------:|-----------|
| Gasto | $73 USD | $268 USD equiv | Esmeraldas gasta 3.7x más |
| Impresiones | 35,325 | 152,318 | Esmeraldas 4.3x más |
| Reach | 26,044 | 63,189 | Esmeraldas 2.4x más |
| Clicks | 3,230 | 6,188 | Esmeraldas 1.9x más |
| **CTR** | **9.14%** | 4.06% | ⚠️ Glass mejor engagement |
| **Mensajes** | 114 | **1,381** | ⚠️ Esmeraldas 12x más |
| **Costo/mensaje** | $0.65 | **$0.20** | ⚠️ Esmeraldas 3.25x más barato |
| Campañas totales | 4 | 21 | Esmeraldas tiene caos |
| Activas | 4 | 10 | |
| Pausadas | 0 | 11 | |

**Conclusión de Meta Ads:** Esmeraldas tiene un **funnel de adquisición masivo y eficiente**. El cuello de botella NO está en la publicidad.

## 🔍 Análisis profundo del problema real

### 1. Calidad de leads (hipótesis principal) ⚠️

La campaña que más gasta Esmeraldas es **"SOLER - Catalogo Dinamico WhatsApp"** (94% del budget):
- Spend: ₡131,055
- Mensajes: 1,329
- CTR: 4.10%
- Costo/msg: ₡99 (~$0.20)

Esta es una **DPA (Dynamic Product Ad)** que muestra catálogo de productos. Genera VOLUMEN masivo de "cuánto cuesta?" — la mayoría son window shoppers, no compradores con intención.

Glass en cambio usa **"Mensajes WhatsApp - Robo Viral 2026-04-22"**:
- Spend: $30
- Mensajes: 75
- CTR: 2.81%
- Costo/msg: $0.39

El ángulo **"robo viral"** crea urgencia + miedo + necesidad concreta (seguridad). El lead que llega ya tiene problema definido. Esmeraldas atrae curiosos.

### 2. Conversión post-mensaje (donde se pierden) 🚨

**Datos del CRM (limitados — seed):**

| | Contactos | Hot | Deals | Ganados |
|--|----------:|----:|------:|--------:|
| Glass | 11 | 4 | 3 | **0** |
| Esmeraldas | 3 | 0 | 1 | **0** |

**0 deals ganados en ambas.** Esto sugiere que el problema es el **handoff de mensaje → cierre de venta**. Pero CRM tiene poca data real porque es seed — solo lo que entró desde hoy con el webhook.

### 3. Los 1,381 mensajes NO están en el CRM 🚨

Hasta hoy, los mensajes de Meta caían en el inbox de Meta directamente, sin pasar por nuestro webhook. La visibilidad sobre **qué se les responde y cuándo** estaba en cero.

Esto explica perfectamente la sensación del usuario: hay 1,381 mensajes/mes que probablemente no se contestan a tiempo, se contestan mal, o se contestan a sin calificar y por eso no se cierra venta.

## 🧠 Por qué Glass SÍ convierte (probablemente)

1. **Ángulo de problema concreto**: "Te roban el carro" → vendedor cierra rápido por miedo
2. **Ticket más bajo** ($399-999): decisión rápida, no requiere consenso familiar
3. **CTR alto (9.14%)** indica que el mensaje resuena con la audiencia
4. **Menos mensajes pero más calificados**: 75 mensajes vs 1,329 → cada uno recibe atención real
5. **Servicio one-shot**: cliente decide, paga, se le instala. No hay "lo pienso 2 semanas"

## 💎 Por qué Esmeraldas NO convierte (recomendaciones)

### Problema A: Volumen sin calificación

**FIX:** Reemplazar "Catálogo Dinámico WhatsApp" con **Lead Form pre-calificado**:
1. Antes de WhatsApp, pedir: ocasión (regalo/compromiso/inversión), fecha del evento, presupuesto rango
2. Solo enviar a WhatsApp si presupuesto ≥ USD 500 y fecha < 60 días
3. Resto: secuencia email de nurturing automático

### Problema B: Catálogo atrae window shoppers

**FIX:** Cambiar creatives de "esta pieza, esta pieza, esta pieza" a:
- **Storytelling**: "Su mamá no se mereció diamantes baratos en su día"
- **Urgencia real**: "Solo 8 piezas con esta gema esta temporada"
- **Social proof**: testimonios con foto de clientes reales
- **Educacional**: "Cómo elegir una esmeralda colombiana auténtica"

### Problema C: 21 campañas → caos imposible de optimizar

**FIX:** Pausar las 11 ya pausadas. De las 10 activas, dejar 3-4 ganadoras y matar las que tienen <5 mensajes/30d con bajo CTR. Cada campaña activa debe responder a UN objetivo claro:
1. Awareness (alcance frío) → audiencias amplias
2. Consideration → lookalikes 1% de compradores
3. Conversion → retargeting visitantes web/IG últimos 30d
4. Loyalty → custom audience clientes anteriores con descuento

### Problema D: Mensajes no llegan al CRM

**FIX (ya en producción):** El webhook que armamos hoy (`/api/meta/webhook`) ahora captura **todo mensaje** que llega a Esmeraldas y:
1. Lo etiqueta automáticamente con `business=esmeraldas_soler`
2. Elena responde con KB de Esmeraldas (tono cálido, no presiona)
3. Detecta hot leads (aniversario + presupuesto + fecha < 30d → temp=hot)
4. Logging completo en `/conversations`

**A partir de mañana** la próxima campaña de Esmeraldas vas a tener:
- 100% visibilidad de los mensajes
- Tiempo de respuesta automático <10s
- Calificación automática
- Tracker de quién compró vs no
- Stage del pipeline para cada lead

### Problema E: Ciclo de venta largo no se nurtea

Joyería de USD 500-2000 NO se cierra en la primera conversación. Pero hoy Esmeraldas no tiene secuencia de follow-up.

**FIX:**
1. Lead frío (cold) → email semana 2 + 4 con casos de uso
2. Lead tibio (warm) → WhatsApp manual día 3 + 7
3. Lead caliente (hot) → asesor humano <1h
4. **Re-marketing Meta:** custom audience "mensajeó hace 7-30 días, no compró" → ad con 10% descuento limitado

## 🎯 Acciones inmediatas priorizadas

### Hoy (sin gastar más)
1. **PAUSAR** las 11 campañas Esmeraldas ya pausadas que están consumiendo el panel sin aportar (limpieza visual)
2. **Revisar mensaje por mensaje** los últimos 100 que llegaron a Esmeraldas vía Meta inbox para entender QUÉ están preguntando los 1,381 que no compran
3. **Activar webhook capture** de todos los mensajes Esmeraldas (ya hecho — solo confirmar test real)
4. **Definir 3 segmentos de comprador** ideal: regalo/compromiso/inversión

### Semana 1
1. **Pausar las 7-8 campañas activas más débiles** de Esmeraldas, dejar 3 ganadoras
2. **Crear Lead Form pre-calificado** en lugar de catálogo abierto en al menos 1 campaña
3. **3 nuevos creatives** con angles distintos (storytelling, urgencia, social proof)
4. **Configurar Elena Esmeraldas KB** para que pida ocasión + presupuesto antes del precio

### Semana 2-4
1. **Setup retargeting**: custom audience de mensajeantes últimos 30d
2. **Secuencia de nurturing email** vía Resend/Mailchimp (3 toques)
3. **Hot lead alert** automático: si CRM marca temperatura=hot, mandar WhatsApp al asesor humano
4. **A/B test** 2 ofertas: "10% off compras > $800" vs "Envío express gratis + tarjeta personalizada"

## 📈 Métrica de éxito a 60 días

| Métrica actual | Target 60d | Cómo |
|---------------|-----------|------|
| 1,381 msg/mes Esmeraldas | 800-1,000 (menos pero calificados) | Lead form |
| 0 deals ganados (CRM) | 8-15/mes (1% de mensajes) | Pipeline activo |
| 0 visibilidad post-msg | 100% trackeado | Webhook ya activo |
| Cost/msg $0.20 | $0.40-0.60 (más caro pero calificado) | Audiencias estrechas |
| Avg ticket | ? | $800 USD target |

## 🔄 Aplicar aprendizajes de Glass a Esmeraldas

Lo que Glass hace bien (y Esmeraldas no):
- ✅ Pocos enemigos = enfoque (4 campañas vs 21)
- ✅ Ángulo emocional con urgencia (robo)
- ✅ Decisión rápida (no requiere consultar pareja)
- ✅ Mensaje directo: "esto resuelve esto"
- ✅ Ticket cerrable en 1-2 conversaciones

Lo que Esmeraldas debería copiar:
- Enfocar a 4-5 campañas máximo
- Ángulo emocional (regalo memorable, no "compra joya")
- Crear urgencia real (stock limitado, gemas únicas)
- Pre-calificar antes de WhatsApp para no perder tiempo
- Diseñar conversación para cerrar en 3-5 mensajes con asesor

---

**Próxima acción del usuario:** Decidir si querés que ataque el problema de Esmeraldas (Lead Form + audiencias + nuevos creatives) o si preferís que primero validemos el webhook real con un mensaje a Esmeraldas y veamos qué responde Elena.
