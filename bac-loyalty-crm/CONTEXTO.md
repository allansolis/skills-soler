# Contexto del proyecto — BAC Loyalty CRM

Documento vivo. Se actualiza con cada decisión, supuesto o hallazgo relevante.

## Glosario

| Término | Significado |
|---|---|
| **BAC Loyalty** | Programa de lealtad del Banco BAC (cliente final del CRM) |
| **API BAC** | Plataforma backend del CRM que expone APIs de conversaciones, contactos, KB. URL real definida por `ZOLUTIUM_BASE_URL` en `.env` (nombre de variable legado del workflow original). |
| **Glass Soler** | Marca/producto del usuario Allan Solis — vertical de los workflows con sufijo "Glass Soler" |
| **Esmeralda** | Segunda marca/vertical paralela a Glass Soler |
| **KB** | Knowledge Base — base de conocimiento usada por agentes de IA |
| **Agente N** | Workflow n8n con propósito específico (Agente 7 = KB, Agente 8 = inventario, etc.) |
| **Elena** | Sub-agente Claude orquestador del CRM |

## Decisiones arquitectónicas

### D1 — Versionado de workflows
Fecha: 2026-05-18
**Decisión**: el repo `bac-loyalty-crm/n8n-workflows/` es la **fuente de verdad** de los workflows. Editar siempre acá, importar a n8n cloud después.
**Por qué**: n8n cloud no tiene historial Git nativo. Sin versionado externo, revertir un cambio malo es manual y propenso a errores.

### D2 — Estrategia para PII en prompts de IA
Fecha: 2026-05-19
**Decisión**: nunca enviar PII directa (email, teléfono, documento, nombre) a Claude. Hashear IDs con `sha256(id + PII_SALT)`, truncar texto a 4000 caracteres.
**Por qué**: cumplimiento GDPR + reducción de superficie de ataque. El SALT se mantiene estable para que los hashes sean comparables entre ejecuciones.

### D3 — Idempotencia obligatoria
Fecha: 2026-05-19
**Decisión**: todo POST hacia API BAC debe enviar header `Idempotency-Key: <batch_id>-<destino>`. El `batch_id` se calcula determinísticamente a partir de la ventana temporal del run.
**Por qué**: si el cron corre dos veces (manual + programado) o n8n reintenta automáticamente, se evitan duplicados en KB.

### D4 — Modelo Claude por defecto
Fecha: 2026-05-19
**Decisión**: usar `claude-opus-4-7` para análisis de calidad (KB, marketing, informes ejecutivos); `claude-sonnet-4-6` como fallback si el workspace no tiene Opus.
**Por qué**: balance costo/calidad. Opus 4.7 tiene mejor razonamiento sobre datasets de conversaciones; Sonnet es suficiente para tareas tácticas.

### D5 — Rama de descarte ante baja confianza
Fecha: 2026-05-19
**Decisión**: si la respuesta de Claude tiene `confianza < 0.6` o JSON inválido, el batch no se persiste en KB; se loguea para auditoría y termina sin error.
**Por qué**: prevenir contaminación de KB con análisis pobres. Mejor pérdida ocasional que ruido acumulado.

## Supuestos por validar

- [ ] La API BAC soporta `Idempotency-Key` (estándar Stripe). Confirmar con sus docs.
- [ ] El endpoint `/conversations/recent` acepta paginación con `?cursor=<string>` y devuelve `next_cursor` en la respuesta. Confirmar con captura de curl real.
- [ ] El workspace Anthropic de BAC tiene `claude-opus-4-7` habilitado. Si no, bajar a Sonnet en todos los workflows.
- [ ] Los workflows duplicados Glass Soler vs Esmeralda son **dos verticales independientes**, no errores de copy-paste. Verificar con el usuario.

## Hallazgos

### 2026-05-19 — Tasa de fallo crítica
Workspace muestra 74.6% de averías (170/228). Auditoría pendiente — ver `AUDITORIA-FALLOS.md`.

### 2026-05-19 — Agente 7 sin paginación
El workflow original truncaba en 500 conversaciones por ventana de 6h. Fix aplicado en v2.

## Próximos pasos

1. Diagnosticar y resolver el 74.6% de fallos (`AUDITORIA-FALLOS.md`).
2. Descargar los 14 workflows pendientes desde n8n cloud y versionarlos.
3. Confirmar supuestos pendientes con Allan.
4. Diseñar modelo de datos canónico del CRM (`modelo-datos/`).
5. Configurar Error Workflow global con notificación Slack.
