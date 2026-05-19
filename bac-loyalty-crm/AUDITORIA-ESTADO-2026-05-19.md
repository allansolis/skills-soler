# Auditoría de estado — BAC Loyalty CRM

**Fecha**: 2026-05-19
**Rama**: `claude/bac-loyalty-crm-KEMbl`
**Repo**: `allansolis/skills-soler`
**Alcance**: estado del directorio `bac-loyalty-crm/` (workflows, scaffolds, plantillas, scripts, sub-agentes, CI, docs).

## Resumen ejecutivo

El CRM cuenta con un scaffolding sólido: documentación de arquitectura, convenciones, modelo de datos, plantillas n8n parametrizadas, scripts de auditoría y lint, CI con validación de convenciones, y una sub-agente orquestadora (Elena) más un especialista de soporte. Sin embargo, **solo 2 de 15 workflows productivos están versionados con JSON real** (Agente 7 v2 y Agente 8); los 12 restantes son scaffolds genéricos derivados de plantillas, por lo que el repo aún no es fuente de verdad real para la mayoría del workspace n8n cloud. El bloqueador operativo principal sigue siendo la **tasa de fallo del 74.6% (170/228 ejecuciones)** sin auditoría empírica completada porque el sandbox web no puede acceder a `allannsolis94.app.n8n.cloud`. El workflow `notify-slack-on-error` existe pero no está confirmado como Error Workflow global en n8n. Cumplimiento (PII hash, idempotencia, lint) está bien encapsulado en plantillas y CI, pero falta el modelo de datos canónico de transacciones de lealtad y la cobertura efectiva de los dominios "campañas" y "analítica" depende de descargar los JSON reales.

## Inventario actual

### Workflows productivos (n8n)

| # | Workflow | Estado en repo | Notas |
|---|---|---|---|
| 1 | Agente 7 — Actualizador de KB Inteligente v2 | Versionado real | Fixes aplicados: paginación, idempotencia, validación IA, serialización POST, PII hash |
| 2 | Agente 7 v1 (legacy) | Deprecated | En `n8n-workflows/deprecated/` para auditoría |
| 3 | Agente 8 — Gestor de inventario CRM | Versionado real | Sigue patrón propio (cron horario, GET inventario + canjes) |
| 4 | Notify Slack on Error | Versionado real | Workflow global de errores con severidad inferida (P1/P2/P3/P4) |
| 5 | Agente 9 — Sincronización CRM Bidireccional | Scaffold | Plantilla `tpl-agente-sync-bidireccional` |
| 6 | Agente 10 — Informe Ejecutivo Diario | Scaffold | Plantilla `tpl-agente-informe-diario` |
| 7 | Automatizador tuberías — Glass Soler | Scaffold | Plantilla `tpl-agente-optimizador` |
| 8 | Cerebro Marketing IA — Glass Soler | Scaffold | Plantilla `tpl-agente-marketing-ia` |
| 9 | Cerebro Marketing IA — Esmeralda | Scaffold | Plantilla `tpl-agente-marketing-ia` |
| 10 | Informe Inteligencia Marketing — Glass Soler | Scaffold | Plantilla `tpl-agente-informe-diario` |
| 11 | Informe Inteligencia Marketing — Esmeralda | Scaffold | Plantilla `tpl-agente-informe-diario` |
| 12 | Optimizador campañas — Glass Soler | Scaffold | Plantilla `tpl-agente-optimizador` |
| 13 | Optimizador campañas — Esmeralda | Scaffold | Plantilla `tpl-agente-optimizador` |
| 14 | Creador campañas — Glass Soler | Scaffold | Plantilla `tpl-agente-marketing-ia` |
| 15 | Creador campañas — Esmeralda | Scaffold | Plantilla `tpl-agente-marketing-ia` |
| 16 | Sincronización del rendimiento | Scaffold | Plantilla `tpl-agente-sync-bidireccional` |

### Plantillas reutilizables

| Plantilla | Aplica a | Estado |
|---|---|---|
| `tpl-agente-sync-bidireccional.json` | Agente 9, Sync rendimiento | OK (lint) |
| `tpl-agente-informe-diario.json` | Agente 10, Informes inteligencia x2 | OK (lint) |
| `tpl-agente-marketing-ia.json` | Cerebros marketing x2, Creadores campañas x2 | OK (lint) |
| `tpl-agente-optimizador.json` | Optimizadores x2, Automatizador tuberías | OK (lint) |

### Sub-agentes

| Sub-agente | Rol | Modelo | Notas |
|---|---|---|---|
| `elena` | Orquestadora multi-agente | `opus` | Fuente de verdad en `agentes/elena.md` |
| `agente-soporte-loyalty` | Soporte y atención del programa de lealtad | `claude-opus-4-7` | Triage, puntos, niveles, canjes, escalamientos, plantillas de respuesta |

### Scripts operativos

| Script | Propósito | Estado |
|---|---|---|
| `scripts/auditar-fallos.sh` | Diagnóstico de fallos via API n8n (CSV + reporte MD) | Listo; requiere `N8N_API_KEY` real |
| `scripts/generar-scaffolds.py` | Regenera los 12 scaffolds desde plantillas + INDEX | Listo, ejecutado y commiteado |
| `scripts/lint-workflows.py` | Linter de convenciones (idempotencia, retry, timeout, modelo Claude, validador post-IA) | Listo, 19/19 archivos sin avisos |

### Documentación

| Archivo | Contenido | Estado |
|---|---|---|
| `README.md` | Arquitectura, estructura, cómo trabajar, convenciones | Completo |
| `CONTEXTO.md` | Glosario, decisiones D1-D5, supuestos por validar, hallazgos | Vivo |
| `AUDITORIA-FALLOS.md` | 10 hipótesis, procedimiento de auditoría, quick wins | Completo |
| `modelo-datos/README.md` | Entidades (Contact, Conversation, Campaign, Segment, KBDocument), endpoints | Inicial — falta `LoyaltyTransaction` |
| `n8n-workflows/README.md` | Doc Agente 7 v2, pendientes de versionar | Actualizado |
| `n8n-templates/README.md` | Catálogo de plantillas y patrones compartidos | Completo |
| `n8n-workflows/scaffolds/INDEX.md` | Mapeo slug -> nombre real -> plantilla | Completo |
| `agentes/README.md` | Catálogo de sub-agentes, convenciones, sync con `~/.claude/agents/` | Completo |
| `.env.example` | Plantilla de variables (Zolutium, Anthropic, n8n, PII_SALT) | Completo |

### Infraestructura de CI/CD

| Pieza | Estado | Notas |
|---|---|---|
| `.github/workflows/bac-loyalty-crm.yml` | Activo | 4 jobs: validación JSON, lint convenciones, sync scaffolds, .env no versionado |
| `.gitignore` | Mínimo (`.env`) | Falta excluir `auditoria-fallos-*.csv`, `reporte-auditoria-*.md`, `__pycache__/` |
| Pre-commit hook | No detectado | Lint depende de CI (no de hook local) |
| Branch protection | No verificado | Pendiente confirmar reglas de PR en GitHub |

## Cobertura por dominio del CRM

| # | Dominio | Cobertura | Detalle |
|---|---|---|---|
| 1 | Clientes y segmentación | **A medias** | Modelo `Contact`, `Segment`, RFM definido en docs; sin workflow propio de segmentación dinámica |
| 2 | Programa de lealtad (puntos, niveles, canjes) | **A medias** | Agente 8 cubre inventario y canjes pendientes; `agente-soporte-loyalty` cubre cara cliente; **falta entidad `LoyaltyTransaction` canónica** |
| 3 | Campañas y marketing | **A medias** | 8 scaffolds (Cerebro/Creador/Optimizador x2 + Informes x2) — sin JSON real, sin tests A/B documentados |
| 4 | Ventas y pipeline | **Vacío** | No hay workflow ni doc; no aplica si el CRM es solo lealtad, validar con Allan |
| 5 | Soporte y atención | **Bien cubierto** | Sub-agente `agente-soporte-loyalty` operativo con triage, plantillas, criterios de escalamiento |
| 6 | Analítica y reportes | **A medias** | 3 scaffolds (Agente 10 + Informes Inteligencia x2) — falta dashboard real y catálogo de KPIs |
| 7 | Integraciones n8n | **Bien cubierto** | Plantillas, lint, CI, MCP configurado (bloqueado en sandbox web), Error Workflow versionado |
| 8 | Cumplimiento (GDPR/PCI) | **Bien cubierto** | PII hash (D2), idempotencia (D3), `.env` aislado, CI valida; falta política de retención y DPIA formal |

**Resumen**: 3 dominios "bien cubiertos", 4 "a medias", 1 "vacío".

## Riesgos y deudas detectadas

1. **12/15 workflows son scaffolds genéricos sin JSON real** — el repo no es fuente de verdad funcional; cualquier rollback requeriría reconstruir el workflow desde n8n cloud, no desde Git. Impacto: si el workspace cae o un workflow se corrompe, no se puede restaurar desde el repo.

2. **74.6% de fallos sin causa raíz confirmada** — la auditoría depende de ejecutar `scripts/auditar-fallos.sh` con `N8N_API_KEY` real, lo cual no es posible desde el sandbox web (host bloqueado). El plan existe pero no se ha ejecutado contra datos reales.

3. **`Notify Slack on Error` no está confirmado como Error Workflow global** — el JSON está versionado pero no hay evidencia de que esté asignado en n8n cloud a los 15 workflows productivos. Mientras tanto, los fallos pasan silenciosos.

4. **El modelo de datos no incluye `LoyaltyTransaction`** — sin entidad canónica para acumulaciones, canjes y reversos, el cálculo de `puntos_balance` y `puntos_vencen` depende de Zolutium sin contrato documentado en el repo. Riesgo de discrepancias entre el dashboard, el workflow y el sub-agente de soporte.

5. **Supuestos clave sin validar** (de `CONTEXTO.md`):
   - ¿Zolutium soporta header `Idempotency-Key`? Toda la D3 cae si no.
   - ¿`/conversations/recent` devuelve `next_cursor`? La paginación de Agente 7 v2 cae si no.
   - ¿Workspace tiene `claude-opus-4-7` habilitado? Workflows fallarían silenciosamente con fallback no probado.
   - ¿Glass Soler y Esmeralda comparten contactos o son universos separados? Afecta segmentación y reportes.

6. **El `.gitignore` es mínimo** — solo excluye `.env`. Los CSV de auditoría (`auditoria-fallos-*.csv`) y reportes generados por `auditar-fallos.sh` no están ignorados; podrían terminar versionados con datos sensibles de ejecuciones (IDs, mensajes de error con tokens en URL).

7. **No hay tests de integración ni dataset fixtures** — el lint valida estructura estática, pero ningún workflow se ejecuta contra datos sintéticos en CI. Un cambio en un placeholder de plantilla podría romper en producción sin alarma.

8. **No hay tracking de versión del workspace n8n** — el repo no registra qué workflow se importó cuándo ni con qué hash, así que un drift entre el JSON del repo y el JSON real en n8n cloud es indetectable sin diff manual.

9. **Cumplimiento parcial**: PII hash y aislamiento de `.env` están implementados, pero falta política de retención de datos, registro de actividades de tratamiento (RAT) GDPR, y revisión PCI si el programa toca números de tarjeta para acumulación de puntos.

10. **Dominio "Ventas y pipeline" en blanco** — si el CRM debe cubrirlo, hay un hueco; si no, debe documentarse explícitamente que está fuera de alcance.

## Los 3 próximos pasos prioritarios

### Paso 1 — Ejecutar la auditoría de fallos contra datos reales y publicar el reporte

**Objetivo**: convertir la hipótesis del 74.6% en una causa raíz accionable. Correr `scripts/auditar-fallos.sh` desde Claude Code local (no sandbox) o desde la máquina del usuario con `N8N_API_KEY` real, obtener el CSV de las últimas 200 ejecuciones fallidas, identificar el top 3 de nodos/mensajes y validar contra las hipótesis H1-H10 de `AUDITORIA-FALLOS.md`.

**Esfuerzo**: 2-3 horas (1 h ejecutar y agrupar, 1-2 h validar hipótesis dominante con 3 ejecuciones puntuales y aplicar fix).

**Dependencias**:
- `N8N_API_KEY` real del workspace (Allan debe generarla en Settings → API n8n).
- Acceso a la consola n8n cloud para abrir execution IDs y leer stack traces.
- Variable `SLACK_WEBHOOK_ERRORS` definida para activar el Error Workflow tras el fix.

**Impacto en el 74.6%**: directo y máximo. Si la causa es H1 (credenciales) o H2 (endpoint cambió) — las dos hipótesis de probabilidad "Alta" — un solo fix puede bajar la tasa por debajo del 10% en 24 h. Sin este paso, todos los demás esfuerzos van a parar a un sistema que sigue fallando 3 de cada 4 veces.

### Paso 2 — Descargar y versionar los 12 workflows scaffolds con su JSON real

**Objetivo**: reemplazar los 12 `*.scaffold.json` por los exports reales de n8n cloud para que el repo sea fuente de verdad efectiva. Para cada uno: descargar JSON desde n8n (botón ⋯ → Download), guardar en `n8n-workflows/<slug>.json`, mover el scaffold a `deprecated/<slug>.scaffold.v0.json`, pasar el lint, hacer commit por workflow.

**Esfuerzo**: 4-6 horas (15-30 min por workflow incluyendo descarga, normalización, validación de convenciones y commit con mensaje descriptivo).

**Dependencias**:
- Paso 1 completado (no tiene sentido versionar workflows que fallan; documentaríamos código roto).
- Acceso de Allan a la consola n8n cloud para hacer los exports.
- Confirmación de si `Glass Soler` y `Esmeralda` son universos separados (supuesto pendiente de `CONTEXTO.md`), porque puede que algunos workflows sean copia y deban consolidarse en uno con parámetro `marca`.

**Impacto en el 74.6%**: indirecto pero estructural. Cada workflow real versionado expone el patrón de fallo en código revisable, habilita rollback, y permite que el `lint-workflows.py` detecte regresiones antes de re-importar. Sin esto, la auditoría se queda a nivel de logs, no de causa estructural.

### Paso 3 — Activar el Error Workflow global y cerrar las brechas de cumplimiento básicas

**Objetivo**: asignar `notify-slack-on-error` como Error Workflow por defecto en los 15 workflows productivos, definir `SLACK_WEBHOOK_ERRORS` en el workspace, validar que `Idempotency-Key` es honrado por Zolutium con un test (supuesto crítico de D3), añadir al `.gitignore` los patrones de output de auditoría, y crear `modelo-datos/loyalty-transaction.md` con la entidad faltante.

**Esfuerzo**: 3-4 horas (1 h asignar Error Workflow a los 15, 30 min Slack webhook, 30 min test idempotencia con curl, 30 min `.gitignore`, 1-1.5 h diseñar y documentar `LoyaltyTransaction`).

**Dependencias**:
- Acceso de Allan a Settings → Workflow defaults en n8n cloud.
- Slack workspace de BAC con permiso para crear webhook entrante.
- Acceso a documentación Zolutium o sesión con su equipo técnico para confirmar `Idempotency-Key`.

**Impacto en el 74.6%**: medio en el corto plazo, alto en el largo plazo. El Error Workflow no reduce fallos pero **garantiza que nunca más se acumulen 170 fallos silenciosos**; cualquier fallo futuro genera alerta P1/P2/P3/P4 en Slack. Validar `Idempotency-Key` cierra el riesgo de duplicados si los reintentos disparados durante el fix del Paso 1 contaminan KB. La entidad `LoyaltyTransaction` cierra la brecha del dominio "Programa de lealtad" para que el sub-agente de soporte y los workflows de marketing trabajen sobre el mismo contrato.

---

**Recomendación de orden**: ejecutar 1 → 3 → 2. El Paso 3 puede solapar al final del 1 mientras se espera confirmación del fix, y bloquea calidad estructural del Paso 2.
