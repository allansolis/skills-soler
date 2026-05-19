# Plan de remediación — Tasa de fallo n8n del 74.6%

**Workspace**: `allannsolis94.app.n8n.cloud`
**Fecha de inicio**: 2026-05-19
**Responsable de ejecución**: Allan Solis (operación) + Elena (orquestación Claude Code)
**Documento padre**: [`AUDITORIA-FALLOS.md`](./AUDITORIA-FALLOS.md)
**Documento de contexto**: [`CONTEXTO.md`](./CONTEXTO.md)

---

## 1. Resumen ejecutivo

El workspace muestra **170 fallos en 228 ejecuciones (74.6%)** distribuidos entre 15 workflows productivos. La hipótesis dominante (ver `AUDITORIA-FALLOS.md`) apunta a credenciales rotas, endpoints Zolutium modificados y/o variables de entorno ausentes tras la última migración. Sin acceso vivo al MCP n8n desde el sandbox web, el diagnóstico fino requiere que el operador exporte la API key de n8n y ejecute `scripts/auditar-fallos.sh` localmente.

**Meta**: bajar la tasa de fallo a **≤ 5% en 7 días naturales**, sostenida durante 72 h continuas como criterio de cierre.

**Método**: cinco fases incrementales (Fase 0 a Fase 4) que combinan quick wins ciegos, diagnóstico empírico, fixes priorizados por frecuencia, backfill controlado y monitoreo permanente. Cada fase tiene criterio de salida medible y entregables versionados en el repo `skills-soler` rama `claude/bac-loyalty-crm-KEMbl`.

**Esfuerzo total estimado**: 22 horas distribuidas en 7 días (3-4 h/día promedio).

---

## 2. Fases del plan

### Fase 0 — Quick wins sin acceso (día 0, 2 h)

| Campo | Detalle |
|---|---|
| **Objetivo** | Reducir el sangrado mientras se obtiene acceso real; aplicar correcciones que no dependen de la API de n8n. |
| **Entradas requeridas** | Acceso a la UI de n8n cloud con usuario `allannsolis94`; Slack webhook para alertas (`SLACK_WEBHOOK_ERRORS`). |
| **Acciones concretas** | 1. Importar `bac-loyalty-crm/n8n-workflows/notify-slack-on-error.json` a n8n cloud. <br> 2. En `Settings → Workflow settings`, asignarlo como **Error workflow** por defecto en los 15 workflows listados en `CLAUDE.md`. <br> 3. Crear variable de entorno `SLACK_WEBHOOK_ERRORS` en n8n cloud (workspace → Variables). <br> 4. Pausar (`Inactive`) cualquier workflow programado que esté ejecutándose con cron < 15 min hasta terminar el diagnóstico (reduce ruido). <br> 5. Validar que existen `ZOLUTIUM_BASE_URL`, `ANTHROPIC_API_KEY`, `KB_CONFIDENCE_THRESHOLD`, `PII_SALT` en Variables. Si falta alguna, marcar workflow dependiente como `Inactive`. |
| **Entregables** | - Workflow `Notify Slack on Error` activo en n8n. <br> - Captura de Settings de los 15 workflows confirmando Error workflow asignado. <br> - Lista de workflows pausados temporalmente (anotar en `CONTEXTO.md` sección Hallazgos). |
| **Criterio de salida** | Slack recibe al menos un mensaje de prueba (`Test step` del Error Trigger) y los 15 workflows productivos tienen el Error workflow vinculado. |

### Fase 1 — Diagnóstico con N8N_API_KEY (día 1, 4 h)

| Campo | Detalle |
|---|---|
| **Objetivo** | Obtener evidencia cuantitativa de la causa raíz: qué nodo falla, con qué código HTTP y con qué mensaje. |
| **Entradas requeridas** | `N8N_API_KEY` generada en `Settings → n8n API` del workspace; máquina local con `curl` y `jq` (el sandbox web no puede alcanzar `allannsolis94.app.n8n.cloud`). |
| **Acciones concretas** | 1. En la máquina local del usuario: <br> &nbsp;&nbsp;`export N8N_BASE_URL=https://allannsolis94.app.n8n.cloud` <br> &nbsp;&nbsp;`export N8N_API_KEY=<pegar aquí, no commitear>` <br> &nbsp;&nbsp;`cd bac-loyalty-crm/scripts && ./auditar-fallos.sh 200` <br> 2. Adjuntar `auditoria-fallos-2026-05-19.csv` y `reporte-auditoria-2026-05-19.md` al chat con Elena (o subirlos al repo bajo `bac-loyalty-crm/auditorias/` con `.gitignore` si contienen mensajes sensibles). <br> 3. Elena agrupa el CSV por columna `workflow_name` + `nodo_fallido` y emite ranking de top-10 combinaciones que concentran ≥ 80% de los fallos (regla de Pareto). <br> 4. Para cada combinación top-3, abrir 2 `execution_id` representativos en la UI y copiar el stack trace completo a `bac-loyalty-crm/auditorias/stacks-2026-05-19.md`. <br> 5. Validar hipótesis dominante contra la matriz de la sección 3 de este plan. |
| **Entregables** | - `auditoria-fallos-2026-05-19.csv` (170+ filas). <br> - `reporte-auditoria-2026-05-19.md` (autogenerado). <br> - `stacks-2026-05-19.md` con stacks reales de 6-8 ejecuciones. <br> - Tabla de priorización de fixes por impacto (% de fallos cubiertos). |
| **Criterio de salida** | Cada fallo está clasificado contra una de las 10 hipótesis H1-H10, y el top-3 de combinaciones cubre ≥ 70% del volumen total. |

### Fase 2 — Fixes priorizados (días 2-3, 8 h)

| Campo | Detalle |
|---|---|
| **Objetivo** | Aplicar correcciones técnicas al top-3 de causas identificado en Fase 1, en orden de impacto descendente. |
| **Entradas requeridas** | Ranking de Fase 1; permisos para rotar credenciales en Zolutium y Anthropic; ventana de despliegue acordada con el usuario. |
| **Acciones concretas** | 1. Por cada uno de los top-3 fixes, abrir el workflow en n8n, **duplicarlo** con sufijo `-fix-20260519`, aplicar el cambio en la copia. <br> 2. Ejecutar `Test workflow` en el workflow-fix con dataset mínimo (1 registro). <br> 3. Si OK: activar workflow-fix como `Active`, desactivar el original, dejar el original como respaldo durante 72 h antes de borrarlo. <br> 4. Exportar el JSON del workflow-fix y commitearlo en `bac-loyalty-crm/n8n-workflows/<nombre>-v<n>.json` con mensaje `fix(n8n): <causa> en <workflow>`. <br> 5. Repetir hasta haber atacado las causas que cubren ≥ 90% del volumen de fallos. |
| **Entregables** | - 3-6 workflows-fix activos en n8n. <br> - JSONs exportados versionados en `n8n-workflows/`. <br> - Tabla de control con `workflow → causa → fix → fecha → ejecuciones post-fix exitosas`. |
| **Criterio de salida** | En las 6 h posteriores al último fix, la tasa de fallo agregada baja a ≤ 20%. |

### Fase 3 — Backfill y validación (días 4-5, 4 h)

| Campo | Detalle |
|---|---|
| **Objetivo** | Recuperar el trabajo perdido por las 170 ejecuciones fallidas y verificar que los fixes no rompieron casos previamente OK. |
| **Entradas requeridas** | Lista de `execution_id` fallidos con timestamp; capacidad de re-ejecución manual o por ventana temporal. |
| **Acciones concretas** | 1. Filtrar el CSV de Fase 1 por workflows ya corregidos en Fase 2. <br> 2. Para workflows con idempotencia (D3 en `CONTEXTO.md`): re-ejecutar manualmente cada fallido vía `Executions → Retry`. <br> 3. Para workflows sin idempotencia aún: ejecutar manualmente con ventana temporal acotada (`?since=<ts>&until=<ts>`) y revisar duplicados en Zolutium. <br> 4. Cruzar volumetría esperada vs. real con dashboard de Zolutium. <br> 5. Marcar como `recuperada` cada ejecución re-corrida exitosa en `auditoria-fallos-2026-05-19.csv` columna añadida `recovered_at`. |
| **Entregables** | - CSV de Fase 1 con columna `recovered_at` completa para ≥ 95% de las filas. <br> - Diff de volumetría pre/post backfill en Zolutium. <br> - Documentación de casos no recuperables (idealmente < 5%). |
| **Criterio de salida** | ≥ 95% de las 170 ejecuciones fallidas tienen estado `recovered` o `irrecoverable-documentado`. |

### Fase 4 — Monitoreo permanente (días 6-7, 4 h)

| Campo | Detalle |
|---|---|
| **Objetivo** | Garantizar que la tasa de fallo se mantiene ≤ 5% sin intervención manual continua. |
| **Entradas requeridas** | Workflow `notify-slack-on-error` activo (Fase 0); acceso a Zolutium para dashboard de KPIs. |
| **Acciones concretas** | 1. Configurar cron horario que llame `GET /executions?status=error&limit=50` y emita conteo a Zolutium endpoint `/audit/n8n-errors/summary`. <br> 2. Crear dashboard en Zolutium con los 4 KPIs de sección 5 (tasa diaria, MTTR, top workflows, top errores). <br> 3. Definir umbrales de alerta: <br> &nbsp;&nbsp;- WARN si tasa diaria > 10%. <br> &nbsp;&nbsp;- CRIT si tasa diaria > 25% o cualquier P1 sin resolver > 30 min. <br> 4. Documentar en `CONTEXTO.md` la decisión D6 — Monitoreo permanente. <br> 5. Sesión de cierre con Allan: revisión de los 7 días, validación de cierre, plan de prevención (sección 6). |
| **Entregables** | - Dashboard Zolutium operativo con los 4 KPIs. <br> - Cron de monitoreo en n8n activo. <br> - Decisión D6 documentada en `CONTEXTO.md`. <br> - Acta de cierre con métricas finales. |
| **Criterio de salida** | Tasa de fallo agregada ≤ 5% sostenida 72 h continuas, con alertas funcionando y dashboard publicado. |

---

## 3. Matriz hipótesis → fix concreto → tiempo de fix

Esta matriz extiende las 10 hipótesis de `AUDITORIA-FALLOS.md` con el fix técnico exacto.

| # | Hipótesis | Síntoma específico | Fix técnico concreto | Tiempo estimado |
|---|---|---|---|---|
| **H1** | Credencial Zolutium/Anthropic expirada | HTTP 401 / 403 en nodo HTTP Request o nodo Anthropic | 1. En `Settings → Credentials`, abrir credencial `zolutium-api` y `anthropic-api`. 2. Rotar el token (regenerar en Zolutium dashboard y en console.anthropic.com). 3. Pegar el nuevo valor en n8n. 4. Re-ejecutar una falla de muestra con `Retry from this node`. | 30 min |
| **H2** | Endpoint Zolutium cambió de URL/contrato | HTTP 404 o `Unexpected end of JSON input` en nodos que llaman a `services.zolutium.com/api/v1/*` | 1. Cotejar URL del nodo contra la doc actual de Zolutium. 2. Si cambió, reemplazar URL hardcodeada por `={{$env.ZOLUTIUM_BASE_URL}}/<nuevo-path>`. 3. Si cambió el contrato del body, ajustar el `jsonBody` del HTTP Request. 4. Versionar el cambio en `n8n-workflows/`. | 60 min por workflow |
| **H3** | Rate limit Anthropic (Opus 4.7) | HTTP 429 + header `retry-after` en nodo Anthropic | 1. En el nodo Anthropic, abrir `Options → Retry on fail` y configurar `Max tries=5`, `Wait between=10000ms` con backoff exponencial. 2. Agregar nodo `Split In Batches` con `batchSize=3` antes del nodo Anthropic. 3. Si persiste, mover llamadas de Opus a Sonnet 4.6 según D4. | 45 min |
| **H4** | Modelo `claude-opus-4-7` no habilitado en workspace BAC | `invalid_request_error: model_not_found` | 1. Validar acceso a Opus en `console.anthropic.com → Workspace → Models`. 2. Si no está habilitado, solicitar habilitación o cambiar el parámetro `model` en cada nodo Anthropic a `claude-sonnet-4-6` (fallback documentado en D4). 3. Buscar/reemplazar `claude-opus-4-7` en JSONs versionados. | 30 min |
| **H5** | Workflow disparado simultáneamente consigo mismo | Dos `execution_id` con `startedAt` < 5 s de diferencia y fallos en el segundo por bloqueo de recurso | 1. En `Workflow Settings → Caller policy`, establecer `Only workflows on same owner`. 2. En `Settings → Execution Order`, fijar `v1`. 3. Agregar header `Idempotency-Key: {{$execution.id}}` en todos los POST hacia Zolutium (D3). 4. Marcar `Save manual executions = false` para evitar ruido. | 40 min |
| **H6** | Variables de entorno faltantes post-migración | Errores `is not defined` o `Cannot read properties of undefined (reading 'X')` en nodos `Code` | 1. Inventariar variables referenciadas (`grep -r "\$env\." n8n-workflows/`). 2. Cotejar con `Settings → Variables` del workspace. 3. Crear las que faltan: `ZOLUTIUM_BASE_URL`, `ANTHROPIC_API_KEY`, `KB_CONFIDENCE_THRESHOLD`, `PII_SALT`, `SLACK_WEBHOOK_ERRORS`. 4. Re-test del workflow afectado. | 30 min |
| **H7** | Schema de datos cambió (campo renombrado) | `TypeError: Cannot read properties of undefined (reading '<campo>')` en nodo `Code` o `Set` | 1. Capturar el JSON real entrante con un nodo `No Op` temporal. 2. Diferenciar contra el schema esperado en `modelo-datos/`. 3. Actualizar el path en el expression (`{{$json.contact.email}}` → `{{$json.contact_info.email}}`). 4. Considerar agregar nodo `Schema Validation` con AJV al inicio del flujo. | 60 min por workflow |
| **H8** | Timeout en GET masivos sin paginación | `ETIMEDOUT` o `socket hang up` en nodos HTTP con `limit` alto o sin paginación | 1. En el nodo HTTP, `Options → Timeout=120000ms`. 2. Implementar loop con cursor: nodo `HTTP Request` + `If` + `Set cursor`. 3. Para Zolutium: usar `?cursor=<next_cursor>` (D5 supuesto). 4. Ya aplicado en Agente 7 v2 según hallazgo del 2026-05-19. | 90 min por workflow |
| **H9** | Webhooks de Zolutium devuelven HTML en lugar de JSON | `SyntaxError: Unexpected token < in JSON at position 0` | 1. En el nodo HTTP, `Options → Response → Response Format = autodetect`. 2. Agregar nodo `If` que valide `{{$json.error}} === undefined` y rute a rama de error a Slack. 3. Si Zolutium devuelve HTML por 5xx puntual, agregar `Retry on fail` con 3 intentos. | 30 min |
| **H10** | Cron disparándose cuando destino está caído | Fallas concentradas en una ventana horaria recurrente (ej. mantenimiento nocturno Zolutium) | 1. Generar histograma de `startedAt` por hora con `awk -F',' '{print substr($7,12,2)}' auditoria-fallos.csv \| sort \| uniq -c`. 2. Si hay pico en una franja, desplazar el cron 30-60 min fuera de esa ventana. 3. Coordinar con Zolutium horarios de mantenimiento. 4. Agregar `Wait` + `HTTP healthcheck` antes de la lógica principal. | 30 min |

---

## 4. Runbook — Tres modos de falla más probables

Los snippets se ejecutan localmente en la máquina del usuario (sandbox web bloquea n8n cloud).

### Runbook P1 — Credencial expirada (HTTP 401 / 403)

```bash
# 1. Identificar la credencial en uso por el workflow afectado
WORKFLOW_ID="<id>"
curl -fsS -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/workflows/$WORKFLOW_ID" \
  | jq '.nodes[] | select(.credentials != null) | {nodo:.name, credenciales:.credentials}'

# 2. Rotar el token en el proveedor (Zolutium / Anthropic), copiar el nuevo valor

# 3. Actualizar la credencial en n8n cloud vía UI:
#    Settings -> Credentials -> abrir credencial -> pegar nuevo token -> Save

# 4. Re-ejecutar la última ejecución fallida del workflow afectado
EXEC_ID="<id>"
curl -fsS -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/executions/$EXEC_ID/retry"

# 5. Verificar que el siguiente run programado pasa OK (esperar al cron)
curl -fsS -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/executions?workflowId=$WORKFLOW_ID&limit=3" \
  | jq '.data[] | {id, status, startedAt}'
```

Tiempo objetivo de resolución: **15 min**.

### Runbook P2 — Rate limit (HTTP 429)

```bash
# 1. Confirmar el modo de falla buscando 429 en la auditoría reciente
grep -c '"429"' auditoria-fallos-*.csv

# 2. Identificar el workflow más afectado
awk -F',' '$5=="\"429\"" {print $3}' auditoria-fallos-*.csv | sort | uniq -c | sort -rn

# 3. Editar el workflow afectado (n8n UI) y aplicar dos cambios:
#    a) Nodo Anthropic / HTTP -> Options -> Retry on fail:
#       - Max tries: 5
#       - Wait between tries: 10000 ms
#       - Backoff: exponential
#    b) Insertar Split In Batches con batchSize=3 antes del nodo afectado

# 4. Exportar el workflow modificado y versionarlo
#    UI: ... menu -> Download
#    Mover el JSON a bac-loyalty-crm/n8n-workflows/<nombre>-v<n>.json

# 5. Test workflow con dataset reducido, validar que no aparece 429 en 30 min
```

Tiempo objetivo de resolución: **45 min**.

### Runbook P2 — Error de red (ETIMEDOUT / ECONNRESET / socket hang up)

```bash
# 1. Confirmar concentración temporal de fallos de red
awk -F',' '/ETIMEDOUT|ECONN|socket hang up/ {print substr($7,1,13)}' auditoria-fallos-*.csv \
  | sort | uniq -c | sort -rn | head

# 2. Validar si el destino respondió mientras el workflow corría
curl -o /dev/null -s -w "%{http_code} %{time_total}s\n" \
  "$ZOLUTIUM_BASE_URL/health"

# 3. Aplicar en el nodo HTTP afectado:
#    Options -> Timeout: 120000 ms
#    Options -> Retry on fail: 3 tries, 5000 ms entre intentos

# 4. Si el patrón es horario fijo, desplazar el cron
#    Workflow Settings -> Trigger -> Cron expression -> mover +/- 30 min

# 5. Activar healthcheck previo: nodo HTTP GET /health antes del flujo principal,
#    con If que rute a Wait + reintento si status != 200
```

Tiempo objetivo de resolución: **40 min**.

---

## 5. KPIs de seguimiento

### 5.1 Tasa de fallo diaria (objetivo ≤ 5%)

Tabla de seguimiento (rellenar diariamente):

| Día | Fecha | Ejecuciones | Fallidas | Tasa | Estado |
|---|---|---|---|---|---|
| D-1 | 2026-05-18 | 228 | 170 | 74.6% | Línea base |
| D0 | 2026-05-19 | — | — | — | Fase 0 |
| D1 | 2026-05-20 | — | — | — | Fase 1 |
| D2 | 2026-05-21 | — | — | — | Fase 2 |
| D3 | 2026-05-22 | — | — | — | Fase 2 |
| D4 | 2026-05-23 | — | — | — | Fase 3 |
| D5 | 2026-05-24 | — | — | — | Fase 3 |
| D6 | 2026-05-25 | — | — | — | Fase 4 |
| D7 | 2026-05-26 | — | — | — | Cierre |

Visualización ASCII esperada al final del periodo:

```
Tasa de fallo n8n (%)
 80 | X
 70 |
 60 |
 50 |    X
 40 |
 30 |       X
 20 |          X
 10 |             X
  5 |                X-----X-----X
  0 +--+--+--+--+--+--+--+--+--+
     D-1 D0 D1 D2 D3 D4 D5 D6 D7
```

**Dashboard**: Zolutium → `Operations → n8n Health → Daily failure rate` (panel a crear en Fase 4).

### 5.2 MTTR por incidente (objetivo ≤ 45 min para P1)

| Severidad | Umbral MTTR | Fuente |
|---|---|---|
| P1 (credencial, modelo no disponible) | ≤ 30 min | Slack timestamp → resolución en Zolutium audit |
| P2 (rate-limit, red) | ≤ 60 min | idem |
| P3 (parsing, schema) | ≤ 4 h | idem |
| P4 (otro) | ≤ 24 h | idem |

**Dashboard**: Zolutium → `Operations → n8n Health → MTTR distribution`.

### 5.3 Workflows con más fallos (top 5)

Query base sobre el CSV de auditoría:

```bash
awk -F',' 'NR>1 {print $3}' auditoria-fallos-*.csv | sort | uniq -c | sort -rn | head -5
```

**Dashboard**: Zolutium → `Operations → n8n Health → Workflows ranking`.

### 5.4 Top 5 mensajes de error

Query base:

```bash
awk -F',' 'NR>1 {print $6}' auditoria-fallos-*.csv \
  | sed 's/^"//;s/"$//' | cut -c1-80 \
  | sort | uniq -c | sort -rn | head -5
```

**Dashboard**: Zolutium → `Operations → n8n Health → Error messages cloud`.

---

## 6. Plan de prevención (largo plazo, posterior al día 7)

| Iniciativa | Detalle | Plazo |
|---|---|---|
| **Error Workflow global aplicado a los 15** | Verificación periódica (job semanal) que enumera workflows sin `errorWorkflow` asignado y alerta. Implementar con `GET /api/v1/workflows` y filtrar `errorWorkflow == null`. | Semana 2 |
| **Pre-prod environment** | Crear segundo workspace n8n cloud `bac-preprod` (o usar `tags=preprod`). Política: ningún cambio se activa en prod sin pasar 24 h en preprod sin fallos. | Semana 3 |
| **Test workflow en CI** | GitHub Action que valida cada PR a `n8n-workflows/`: schema JSON, `typeVersion` mínimas, presencia de `errorWorkflow`, presencia de `Idempotency-Key` en POST a Zolutium. Bloquear merge si falla. | Semana 3-4 |
| **Alerting Slack/email P1 a Allan** | Extender `notify-slack-on-error.json` para que mensajes con `severity=P1-credencial` envíen también email vía SMTP node. Mantener Slack para P2-P4. | Semana 2 |
| **Backups diarios de workflows** | Cron diario que llama `GET /workflows` y commitea los JSON a una rama `backups/n8n-YYYY-MM-DD` automáticamente. | Semana 4 |
| **Documentación operativa** | Mover los runbooks de la sección 4 a `bac-loyalty-crm/runbooks/` con un archivo por modo de falla, indexado en README. | Semana 2 |

---

## 7. Comunicación — Plantilla de actualización a Allan cada 24h

Enviar por Slack DM o email al cierre de cada día durante los 7 días del plan.

```
Asunto: [n8n remediación] Día D{n} — Tasa {X.X}% | Fase {0..4}

Hola Allan,

Resumen del día {fecha}:

Métricas
- Ejecuciones del día: {N}
- Fallos del día: {M} ({X.X}%)
- Variación vs. ayer: {±Y.Y puntos}
- Acumulado de fallos recuperados (backfill): {K} / 170

Avances
- {bullet 1 — acción concreta, workflow, fix}
- {bullet 2}
- {bullet 3}

Bloqueadores
- {bloqueador si lo hay, con propuesta de desbloqueo}
- {ninguno si aplica}

Próximas 24 h
- {acción 1}
- {acción 2}

Decisiones requeridas
- {pregunta concreta con opciones A/B/C, si aplica}

Riesgos vivos
- {riesgo + mitigación}

Adjuntos / enlaces
- CSV: {ruta}
- Dashboard: {url Zolutium}
- PRs abiertas: {numeros}

— Elena (orquestación) + ejecutado por Allan
```

---

## 8. Riesgos del plan

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El usuario no genera la `N8N_API_KEY` a tiempo, bloqueando Fase 1 | Media | Alto (todo el diagnóstico empírico depende) | Fase 0 reduce sangrado aunque Fase 1 se retrase; matriz hipótesis-fix permite empezar fixes especulativos para H1 y H6 sin diagnóstico fino. |
| Endpoint Zolutium cambió y requiere coordinación con proveedor externo | Media | Alto | Escalar al contacto técnico de Zolutium en día 1; documentar la versión actual de la API en `CONTEXTO.md` como supuesto a validar. |
| Backfill duplica datos en Zolutium por falta de idempotencia preexistente | Media | Medio | D3 obliga a `Idempotency-Key` en POST; antes del backfill, validar header en cada workflow afectado o ejecutar con ventana acotada y verificación post-hoc. |
| Quick wins de Fase 0 ocultan síntomas (Error workflow silencia ruido sin resolver causa) | Baja | Medio | El Slack siempre notifica; el conteo en Zolutium audit no se pierde; la matriz de KPIs sigue midiendo fallos brutos, no solo alertas. |
| Rotar credencial Anthropic invalida workflows fuera del scope BAC | Baja | Alto | Crear credencial dedicada `anthropic-bac-loyalty` antes de rotar; no tocar credenciales compartidas sin inventario previo. |
| Sandbox web Claude Code sigue sin alcanzar n8n cloud, retrasando verificaciones | Alta | Bajo | Procedimiento documentado para ejecución local; Elena consume CSVs/JSONs que el usuario sube al repo o pega en chat. |
| Tasa de fallo no baja por debajo de 5% en 7 días | Baja-Media | Alto | Día 5 incluye checkpoint: si la tasa proyectada no llega a 5%, se extiende Fase 2 y se reagenda cierre al día 10 con re-comunicación al usuario. |

---

**Documento generado**: 2026-05-19
**Próxima revisión**: 2026-05-20 (cierre del Día 1, post-diagnóstico)
**Ubicación canónica**: `bac-loyalty-crm/PLAN-REMEDIACION-74.md`
