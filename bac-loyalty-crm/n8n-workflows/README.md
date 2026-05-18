# Workflows n8n — CRM BAC Loyalty

## Agente 7 — Actualizador de KB Inteligente

Archivo: `agente-7-actualizador-kb-inteligente.json`

### Flujo
```
Cada 6 horas
   ├── GET Conversaciones Recientes ──┐
   └── GET Contactos Activos ─────────┤
                                      ▼
                          Preparar Datos Analisis
                                      ▼
                          Claude Analiza Patrones (Opus 4.7)
                                      ▼
                            Formatear para KB
                                      ▼
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
  Push KB Agregado a    Actualizar KB local    Preparar Texto KB
       Zolutium                                       ▼
                                          Guardar Análisis en Zolutium
```

### Credenciales requeridas en n8n
| ID | Tipo | Uso |
|---|---|---|
| `zolutium-api` | HTTP Header Auth | `Authorization: Bearer <token>` contra la API de Zolutium |
| `anthropic-bac` | Anthropic API | Llamadas a Claude Opus 4.7 |

### Variables de entorno requeridas
| Variable | Ejemplo |
|---|---|
| `ZOLUTIUM_BASE_URL` | `https://services.zolutium.com/api/v1` |

### Importar en n8n Cloud
1. Abre tu workspace en `allannsolis94.app.n8n.cloud`.
2. Menú lateral → **Workflows** → **Import from File**.
3. Selecciona `agente-7-actualizador-kb-inteligente.json`.
4. En cada nodo HTTP, asigna la credencial `Zolutium API`.
5. En el nodo Claude, asigna la credencial `Anthropic BAC`.
6. Configura la variable de entorno `ZOLUTIUM_BASE_URL` en **Settings → Variables**.
7. Ejecuta manualmente con "Test workflow" antes de publicar.

### Validaciones recomendadas antes de activar

- [ ] El endpoint `/conversations/recent?since_hours=6` devuelve `{ data: [...] }`.
- [ ] El endpoint `/contacts/active` devuelve `{ data: [...] }`.
- [ ] El token de Zolutium tiene scope para `kb:write`.
- [ ] El token de Anthropic apunta al workspace correcto.
- [ ] El modelo `claude-opus-4-7` está habilitado en el workspace (si no, baja a `claude-sonnet-4-6`).
- [ ] Probar con un dataset pequeño (modificar `limit` a 5) antes del primer batch real.
- [ ] Confirmar que la respuesta JSON de Claude se parsea sin error (el nodo "Formatear para KB" lanza excepción si no).
- [ ] Activar **Error Workflow** apuntando a un workflow de notificación (Slack/Email).

### Riesgos detectados en el diseño actual

1. **Sin manejo de paginación**: si hay >500 conversaciones en 6h, se truncan.
2. **Sin deduplicación**: si el cron corre dos veces (manual + scheduled), se duplican entradas KB.
3. **Sin validación de schema en respuesta de Claude**: si Claude devuelve markdown en lugar de JSON puro, el workflow falla.
4. **Sin rate limiting**: la rama final ejecuta 3 POST en paralelo a Zolutium; si la API tiene límite estricto, conviene serializar.
5. **PII en logs**: el dataset incluye contactos completos; revisar que n8n no persista ejecuciones con PII más allá del retention permitido por GDPR.

### Próximos pasos sugeridos

- Añadir un nodo **IF** que descarte el batch si `confianza < 0.6`.
- Añadir un workflow gemelo de **rollback** que pueda revertir un `batch_id`.
- Versionar el JSON aquí en cada cambio (este repo es la fuente de verdad).
