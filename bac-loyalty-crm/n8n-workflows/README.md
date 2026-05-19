# Workflows n8n — CRM BAC Loyalty

Fuente de verdad versionada de los workflows del CRM. Editar aquí, importar a n8n cloud.

## Conexión MCP con n8n cloud

- **URL del servidor**: `https://allannsolis94.app.n8n.cloud/mcp-server/http`
- **Auth**: token de acceso (Settings → MCP a nivel de instancia → Detalles de conexión).
- **Configuración**: ya escrita en `~/.claude/settings.json`. Token va en `~/.claude/.env` (no versionado).
- **Bloqueador conocido**: el sandbox web de Claude Code rechaza este host (`host_not_allowed`). El MCP funciona desde Claude Code local.

## Workflows

### Agente 7 — Actualizador de KB Inteligente

| Archivo | Estado |
|---|---|
| `agente-7-actualizador-kb-inteligente.json` | v1 — diseño original reconstruido desde captura |
| `agente-7-actualizador-kb-inteligente.v2.json` | **v2 — con los 5 fixes aplicados (usar este)** |

#### Flujo v2

```
Cada 6 horas
   └── Init Batch (idempotency key determinístico)
         ├── GET Conversaciones (paginado) ──┐
         │      └── Acumular → ¿Más páginas? ─loop─┐
         │                                         ▼
         └── GET Contactos Activos ──────► Preparar Datos (PII safe)
                                                   ▼
                                           Claude Opus 4.7 (system prompt JSON-only)
                                                   ▼
                                           Validar + Formatear KB
                                                   ▼
                                           ¿Descartar batch? (confianza < 0.6 o JSON inválido)
                                              SÍ → Log Descarte
                                              NO → Push KB → Actualizar Local → Guardar Doc
```

#### Cambios v1 → v2

| # | Riesgo v1 | Fix v2 |
|---|---|---|
| 1 | Sin paginación, truncado a 500 conv./6h | Loop `IF ¿Más páginas?` con cursor, sin límite arbitrario |
| 2 | Sin deduplicación si cron corre 2 veces | `batch_id` determinístico (ventana de 6h) + header `Idempotency-Key` en cada POST |
| 3 | Sin validación de JSON de Claude | Extracción robusta (fenced / first-brace), system prompt fuerza JSON, fallback no aborta el workflow |
| 4 | 3 POST paralelos a Zolutium | Serializados en cadena con retry 3x |
| 5 | PII en logs y prompts | `sha256(id+SALT)` antes de enviar a Claude; texto truncado a 4000 chars; sin email/teléfono/documento |

#### Credenciales requeridas en n8n

| ID | Tipo |
|---|---|
| `zolutium-api` | HTTP Header Auth (`Authorization: Bearer …`) |
| `anthropic-bac` | Anthropic API |

#### Variables de entorno

Ver [`../.env.example`](../.env.example). Mínimas:

- `ZOLUTIUM_BASE_URL`
- `KB_CONFIDENCE_THRESHOLD` (default 0.6)
- `PII_SALT` (cadena aleatoria larga, mantener estable para que los hashes coincidan entre runs)

#### Importar v2 en n8n cloud

1. n8n cloud → **Workflows → Import from File** → `agente-7-actualizador-kb-inteligente.v2.json`.
2. Asignar credenciales `zolutium-api` y `anthropic-bac` en cada nodo correspondiente.
3. Variables: settings del workflow → agregar `ZOLUTIUM_BASE_URL`, `KB_CONFIDENCE_THRESHOLD`, `PII_SALT`.
4. **Probar manualmente**: cambiar `limit` del GET Conversaciones a 5, ejecutar `Test workflow`, verificar que Validar + Formatear no entra en rama de error.
5. Si todo OK, **archivar la v1** (no eliminarla — auditoría) y activar la v2.

#### Auditoría rápida pre-activación

- [ ] El endpoint `/conversations/recent?since=ISO&cursor=…` devuelve `{ data: [], next_cursor: null|string }`.
- [ ] El endpoint `/contacts/active` devuelve `{ data: [...] }`.
- [ ] `claude-opus-4-7` habilitado en el workspace Anthropic (fallback: `claude-sonnet-4-6`).
- [ ] `PII_SALT` definido y estable (no rotar entre ejecuciones).
- [ ] `Idempotency-Key` honrado por la API de Zolutium en `/kb/aggregate`, `/kb/local/update`, `/kb/documents`.

## Workflows pendientes de versionar

Listado obtenido de la consola n8n cloud (workspace `allannsolis94`):

- [ ] Agente 8 — Gestor de inventario CRM
- [ ] Agente 9 — Sincronización CRM Bidireccional
- [ ] Agente 10 — Informe Ejecutivo Diario
- [ ] Automatizador principal de tuberías — Glass Soler
- [ ] Cerebro Marketing IA — Glass Soler / Esmeralda
- [ ] Informe de Inteligencia de Marketing — Glass Soler / Esmeralda
- [ ] Optimizador de Campañas con IA — Glass Soler / Esmeralda
- [ ] Creador y estratega de campañas — Glass Soler / Esmeralda
- [ ] Sincronización del rendimiento

Para versionar cada uno: descargar JSON desde n8n cloud (botón ⋯ → Download) o usar MCP cuando esté operativo.
