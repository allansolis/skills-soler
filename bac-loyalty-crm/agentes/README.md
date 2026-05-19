# Sub-agentes versionados — BAC Loyalty CRM

Este directorio contiene la **fuente de verdad** de los sub-agentes Claude usados en el CRM. La copia operativa vive en `~/.claude/agents/` y debe mantenerse sincronizada con estos archivos.

## Catálogo

| Sub-agente | Rol | Modelo | Archivo |
|---|---|---|---|
| `elena` | Orquestadora multi-agente | `opus` | `elena.md` |
| `agente-soporte-loyalty` | Soporte y atención al cliente del programa de lealtad | `claude-opus-4-7` | `agente-soporte-loyalty.md` |

## Convención de sincronización

1. **Editar siempre primero en este repo** (`bac-loyalty-crm/agentes/`).
2. Copiar a `~/.claude/agents/<nombre>.md` para que Claude Code lo cargue.
3. Reiniciar Claude Code si se cambia el frontmatter (`name`, `tools`, `model`).
4. Commit + push en español, Conventional Commits, rama `claude/bac-loyalty-crm-KEMbl`.

## Reglas comunes a todos los sub-agentes

- Idioma de trabajo y respuesta: **español**.
- Sin emojis en archivos, prompts ni respuestas al cliente.
- Sanitización de PII antes de cualquier llamada a IA (decisión D2 de `CONTEXTO.md`).
- Idempotencia obligatoria en POST/PUT a Zolutium con header `Idempotency-Key` (decisión D3).
- Modelo por defecto: `claude-opus-4-7`; fallback `claude-sonnet-4-6` (decisión D4).
- Confianza mínima de IA: `KB_CONFIDENCE_THRESHOLD=0.6` (decisión D5).

## Cómo añadir un nuevo sub-agente

1. Crear `bac-loyalty-crm/agentes/<nombre>.md` con frontmatter YAML (`name`, `description`, `model`, `tools`) y system prompt en español.
2. Copiar a `~/.claude/agents/<nombre>.md`.
3. Actualizar `elena.md` (este directorio y `~/.claude/agents/`) para añadir el nuevo sub-agente a:
   - La sección "Dominios que orquestas" si introduce un dominio nuevo.
   - El catálogo de sub-agentes específicos.
   - La tabla de "Heurísticas de delegación" con las señales que deben dispararlo.
4. Registrar la decisión en `CONTEXTO.md`.
5. Commit + push.
