# 🚀 Setup Elena en Claude Console (Anthropic Managed Agents)

**Plataforma:** https://platform.claude.com/dashboard
**Sección:** Agentes administrados → Agentes
**Estado actual:** Vacío (Aún no hay agentes) → vamos a crear "Elena"

---

## 📋 Paso a paso (10 minutos)

### 1. Click "Nuevo agente" (botón top-right)

Aparece un formulario para crear el agente.

### 2. Información básica

| Campo | Valor |
|-------|-------|
| **Nombre** | `Elena - Grupo Soler` |
| **Descripción** | `Asesora IA multi-marca para Glass, Esmeraldas, Autos e Inversiones Soler. Identifica marca por contexto y responde con KB específica de cada negocio.` |
| **Modelo** | `claude-sonnet-4-5-20250929` |
| **Max tokens** | `1024` |
| **Temperature** | `0.7` |

### 3. System Prompt

Click "System Prompt" o "Instrucciones del sistema" y copia-pega TODO el contenido de:

`elena-master-system-prompt.md`

(El archivo tiene ~12KB con las 4 KBs condensadas + reglas universales)

### 4. Tools / Herramientas (opcional, requiere implementación API)

En "Herramientas" agrega los siguientes tool definitions (copia desde `elena-agent-config.json`):

- `get_business_kb(business_id)` — obtiene KB completa de un negocio
- `score_lead(user_id, business_id, message)` — scoring de intención
- `schedule_appointment(business_id, user_id, date, time, location)` — agendar cita
- `request_human_handoff(business_id, user_id, reason, urgency)` — escalar humano

> **Nota:** Estos tools requieren un endpoint backend que los implemente. Si no lo tienes aún, podes activar Elena sin tools (solo conversacional) y agregarlos después.

### 5. Knowledge Files (opcional, si Console lo soporta)

Si Claude Console permite uploadear archivos como knowledge base:

Sube el archivo: `elena_mega_kb.json` (66KB con las 4 KBs combinadas)

> Si no lo soporta directamente, el System Prompt ya tiene todo el conocimiento crítico inline.

### 6. Memory Store

| Campo | Valor |
|-------|-------|
| **Activar memoria persistente** | ✅ Sí |
| **Scope** | per_user_per_business |
| **Retención** | 365 días |

Esto permite que Elena recuerde a clientes recurrentes y continúe conversaciones entre sesiones.

### 7. Rate Limiting

| Campo | Valor |
|-------|-------|
| **Max requests/min** | 60 |
| **Max tokens/día** | 1,000,000 |

### 8. Webhook (opcional)

Si quieres que Elena notifique handoffs a tu sistema:

| Campo | Valor |
|-------|-------|
| **URL** | `https://allannsolis94.app.n8n.cloud/webhook/elena-managed-agent` |
| **Auth header** | `X-Webhook-Secret` |
| **Auth value** | `Ok2XkP56Q-P503zT1dJWtgsS_V1b9NeRze9NOL_bDLQ` |
| **Notify on** | Handoff requests, Hot leads |

### 9. Probar

Click "Probar agente" o "Test agent" y enviar:

```
Hola, busco polarizado para mi Honda Civic
```

Esperado: Elena debería:
1. Identificar marca = Glass Soler
2. Responder con saludo Glass: "Hola, soy Elena de Glass Soler 🛡️ ¿Con quién tengo el gusto?"
3. Mencionar paquetes según el vehículo

### 10. Activar el agente

Click toggle "Activo" / "Active" en la página del agente.

---

## 🔗 Integraciones después de crear el agente

### Conectar con WhatsApp Business / Meta

En el agente activo:
1. Settings → Integrations → Add Integration
2. Selecciona "WhatsApp Business" o "Meta Messenger"
3. Conecta con tu Business Account de Meta (App "Soler")
4. Vincula las 4 pages:
   - Glass Soler `860529027138846`
   - Esmeraldas `797310113463115`
   - Autos `100123132505557`
   - Inversiones `796480326889963`

Cada mensaje entrante incluirá el `recipient.id` que Elena usa para identificar la marca.

### Conectar con n8n existente

Tu workflow n8n en `https://allannsolis94.app.n8n.cloud/webhook/glass-soler` puede:
- **Opción A:** Seguir llamando bot local :5001 (como ahora)
- **Opción B:** Llamar al Managed Agent Elena via API:
  ```
  POST https://api.anthropic.com/v1/agents/{agent_id}/messages
  Headers: x-api-key: $ANTHROPIC_API_KEY, anthropic-version: 2023-06-01
  Body: { "user_id": sender_id, "message": message_text, "metadata": { "business_id": "glass_soler" } }
  ```

**Recomendación:** Empezar con los bots locales (que ya funcionan) y migrar a Managed Agent gradualmente.

---

## 🆔 Cuando esté creado, copia el ID

Una vez que el agente esté creado, anota:

- **Agent ID:** (aparece en la URL o página del agente, formato `agt_xxx`)

Guárdalo en `.env`:
```
ELENA_MANAGED_AGENT_ID=agt_xxx
```

---

## 🎯 Beneficios vs bots locales

| | Bots locales | Managed Agent Claude |
|---|---|---|
| Costo | API directa Anthropic | Anthropic + overhead managed |
| Latencia | ~1s | ~1-2s |
| Persistencia | SQLite local | Anthropic cloud |
| Escalabilidad | 1 servidor | Auto-scaling |
| Memoria | Por restart | Persistente cloud |
| Backup | Manual git | Auto Anthropic |
| Acceso | Solo desde tunnel | API global |
| Tools | Python flask | Tool use nativo |
| Multi-canal | Vía n8n + Meta | Integración directa |
| Logs | Local logs | Console UI dashboard |

**Estrategia híbrida recomendada:**
- 🤖 **Managed Agent** para canal Web/embebido + nuevos negocios
- 🐍 **Bots Flask locales** para WhatsApp/IG/Messenger via n8n (ya optimizado)
- 📊 **CRM** consolida data de ambos vía API

---

## 📦 Archivos en esta carpeta

| Archivo | Para qué |
|---------|----------|
| `elena-master-system-prompt.md` | El prompt completo (copia-pega en System Prompt) |
| `elena-agent-config.json` | Configuración estructurada del agente |
| `elena_mega_kb.json` | KBs combinadas de los 4 negocios (66KB) |
| `SETUP-CLAUDE-CONSOLE.md` | Esta guía |

---

## ✅ Checklist de creación

- [ ] Click "Nuevo agente" en Claude Console
- [ ] Nombre: "Elena - Grupo Soler"
- [ ] Modelo: claude-sonnet-4-5-20250929
- [ ] Pegar contenido de elena-master-system-prompt.md
- [ ] Configurar memoria persistente
- [ ] (Opcional) Agregar 4 tools del config JSON
- [ ] (Opcional) Subir elena_mega_kb.json como knowledge
- [ ] Configurar webhook a n8n
- [ ] Probar con mensaje de Glass: "polarizado Honda Civic"
- [ ] Probar con mensaje de Esmeraldas: "aretes esmeralda precio"
- [ ] Probar con mensaje de Autos: "vehículo usado financiamiento"
- [ ] Probar con mensaje de Inversiones: "apartamento Escazú ROI"
- [ ] Toggle ACTIVO
- [ ] Anotar Agent ID en .env

---

## 💡 Si el agente no detecta bien la marca

Refinar el System Prompt agregando MÁS palabras clave en la tabla de identificación. Cada vez que veas conversaciones donde Elena equivocó la marca, agrega esas palabras al pattern.

También podés usar el campo `metadata.business_id` en cada request — el frontend o n8n lo setea según la page/canal de origen y Elena no tiene que adivinar.

---

**Última actualización:** 2026-05-18
**Status:** Listo para crear (esperando que vos hagas el setup en Console)
