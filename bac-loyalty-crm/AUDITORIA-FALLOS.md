# Auditoría — 74.6% de tasa de fallo en n8n

**Síntoma**: workspace `allannsolis94.app.n8n.cloud` reporta 228 ejecuciones de producción, **170 fallidas** (74.6%). Tiempo promedio 0.42 s.

## Hipótesis priorizadas

| # | Hipótesis | Probabilidad | Diagnóstico rápido |
|---|---|---|---|
| H1 | Credenciales rotas/expiradas (API BAC o Anthropic) | **Alta** | Buscar errores HTTP 401/403 en ejecuciones |
| H2 | Endpoint API BAC cambió de URL/contrato | Alta | Buscar 404 o body decoding errors |
| H3 | Rate limit en Anthropic API (Opus 4.7 cuota) | Media | Buscar 429 o "rate limit" |
| H4 | Modelo Claude no disponible en workspace | Media | Buscar `model_not_found` o `invalid_request_error` |
| H5 | Workflow lanzado simultáneo con sí mismo (sin idempotencia) | Media | Comparar timestamps de runs duplicados |
| H6 | Variables de entorno faltantes tras migración | Alta | Buscar `undefined` o `is not defined` en logs |
| H7 | Cambio en schema de datos (campo renombrado) | Media | Buscar `Cannot read property X of undefined` |
| H8 | Timeout en GET masivos sin paginación | Baja | Buscar `ETIMEDOUT` o `socket hang up` |
| H9 | Webhooks de API BAC devolviendo HTML en lugar de JSON | Baja | Buscar `Unexpected token < in JSON` |
| H10 | Cron disparándose cuando el destino está caído (mantenimiento) | Baja | Correlacionar fallas con ventanas horarias |

## Procedimiento (ejecutar en orden)

### Paso 1 — Obtener la muestra de fallos

Con MCP n8n activo (Claude Code local):

```
# Listar últimas 50 ejecuciones fallidas
mcp__n8n-mcp__list_executions(status="error", limit=50)
```

Sin MCP (vía consola n8n):
1. **Executions** → filtro `Status = Error` → orden `Started at desc` → primeras 50.
2. Para cada una, abrir → tab **Error** → copiar nombre del nodo que falló + mensaje.

### Paso 2 — Tabular fallos

Crear `auditoria-fallos-YYYY-MM-DD.csv` con columnas:

```
execution_id, workflow, nodo_fallido, codigo_http, mensaje_error, timestamp
```

### Paso 3 — Agrupar y priorizar

```bash
# Top nodos que fallan
sort -t, -k3 auditoria-fallos.csv | cut -d, -f2,3 | uniq -c | sort -rn | head -20

# Top códigos de error
cut -d, -f4 auditoria-fallos.csv | sort | uniq -c | sort -rn

# Top mensajes (primeras 80 chars)
cut -d, -f5 auditoria-fallos.csv | cut -c1-80 | sort | uniq -c | sort -rn | head -20
```

### Paso 4 — Validar hipótesis dominante

Tomar la hipótesis con más coincidencias y validarla con 3 ejecuciones puntuales:

- ¿Mismo nodo? ¿Mismo workflow? ¿Mismo intervalo?
- ¿Pasa también en ejecuciones manuales o solo en programadas?
- ¿Está reproducible al re-ejecutar?

### Paso 5 — Fix y backfill

Por cada workflow afectado:

1. Aplicar el fix (rotar credencial, ajustar URL, agregar paginación, etc.).
2. Probar con `Test workflow` en dataset pequeño.
3. Si OK, ejecutar manualmente las últimas N horas que fallaron (backfill).
4. Monitorear las próximas 24 h de ejecuciones programadas.

## Checklist de verificación post-fix

- [ ] Tasa de fallo en las últimas 24 h bajó de 74.6% a < 5%.
- [ ] Las ejecuciones fallidas restantes tienen causa diferente al fix aplicado.
- [ ] Cada workflow afectado tiene un Error Workflow asociado.
- [ ] Notificación Slack/email configurada para fallos críticos.
- [ ] Documentado el incident en `CONTEXTO.md` con fecha, causa raíz, fix.

## Plantilla de reporte ejecutivo

```
# Reporte auditoría n8n — YYYY-MM-DD

## Resumen
- Fallos analizados: N
- Causa raíz: <una línea>
- Workflows afectados: N de 15
- Fix aplicado: <descripción>
- Tasa de fallo antes / después: 74.6% → X.X%

## Detalle por hipótesis
H1 — credenciales: descartada / confirmada (N casos)
H2 — endpoint cambió: ...
...

## Acciones tomadas
1. ...
2. ...

## Acciones pendientes
- ...

## Riesgos residuales
- ...
```

## Quick wins inmediatos (aplicar aunque la auditoría aún no termine)

1. **Activar Error Workflow global**: crear un workflow `notify-slack-on-error` y asignarlo como Error Workflow por defecto en cada workflow productivo.
2. **Limitar concurrencia**: en Settings de cada workflow programado, marcar `Save manual executions = false` y `Execution Order = v1`.
3. **Variables de entorno**: validar que `ZOLUTIUM_BASE_URL`, `ANTHROPIC_API_KEY`, `KB_CONFIDENCE_THRESHOLD` están definidos en el workspace.
4. **Pinear versiones de tipos de nodos**: revisar que cada HTTP node usa `typeVersion: 4.2`, no versiones antiguas.
