# Plantillas base de workflows n8n

Plantillas reutilizables para los 14 workflows pendientes del CRM. Cada una sigue las convenciones del proyecto: idempotencia, manejo de errores, validación de IA, sanitización PII.

## Plantillas disponibles

| Plantilla | Aplica a workflows |
|---|---|
| `tpl-agente-sync-bidireccional.json` | Agente 9 — Sincronización CRM Bidireccional, Sincronización del rendimiento |
| `tpl-agente-informe-diario.json` | Agente 10 — Informe Ejecutivo Diario, Informe de Inteligencia de Marketing × 2 |
| `tpl-agente-marketing-ia.json` | Cerebro Marketing IA × 2, Creador y estratega de campañas × 2 |
| `tpl-agente-optimizador.json` | Optimizador de campañas con IA × 2, Automatizador principal de tuberías |

Agente 7 (KB) ya existe en `../n8n-workflows/` y Agente 8 (inventario) sigue patrón propio (no incluido en plantillas, generar a demanda).

## Cómo instanciar una plantilla

1. Copia el JSON: `cp tpl-XXX.json ../n8n-workflows/agente-N-nombre.json`
2. Cambia `"name"` al nombre real del workflow.
3. Reemplaza los placeholders `___ENDPOINT___`, `___MODELO___`, `___CRON___` por valores reales.
4. Asigna credenciales en los nodos HTTP (`zolutium-api`) y IA (`anthropic-bac`).
5. Define variables de entorno requeridas en n8n cloud.
6. Importa, prueba con dataset pequeño, publica.

## Patrones compartidos en todas las plantillas

- **Init Batch**: nodo Code que genera `batch_id` determinístico por ventana temporal.
- **GET paginado**: HTTP + Code "Acumular" + IF "¿Más páginas?" en loop hasta agotar cursor.
- **Sanitización PII**: Code que hashea IDs y trunca texto antes de cualquier llamada IA.
- **Validar IA**: Code que extrae JSON robustamente y descarta si confianza < umbral.
- **POST con Idempotency-Key**: header `Idempotency-Key: <batch_id>-<destino>` en cada POST.
- **Rama de error**: IF que separa éxito de error y dirige a Log Descarte.
