# BAC Loyalty CRM

Sistema de gestión y automatización del programa de lealtad de BAC, orquestado por la sub-agente **Elena** y soportado por workflows n8n + Claude.

## Arquitectura

```
                                 ┌─────────────────┐
                                 │  Elena (sub-    │
                                 │  agente Claude) │
                                 │   orquestador   │
                                 └────────┬────────┘
                                          │ delega
        ┌───────────────────┬─────────────┼─────────────┬───────────────────┐
        ▼                   ▼             ▼             ▼                   ▼
 ┌─────────────┐    ┌─────────────┐  ┌─────────┐  ┌─────────────┐   ┌──────────────┐
 │  Workflows  │    │   Claude    │  │ API BAC│  │   Skills    │   │   GitHub     │
 │     n8n     │◄──►│  Opus 4.7   │  │ Plataf. │  │   locales   │   │  (este repo) │
 │  (15 prod)  │    │     API     │  │  datos  │  │  (2136)     │   │   versionado │
 └─────────────┘    └─────────────┘  └─────────┘  └─────────────┘   └──────────────┘
```

## Estructura del repo

```
bac-loyalty-crm/
├── README.md                    ← este archivo
├── CONTEXTO.md                  ← contexto vivo: decisiones, supuestos, glosario
├── AUDITORIA-FALLOS.md          ← plan para diagnosticar el 74.6% de averías
├── .env.example                 ← plantilla de variables (no versionar .env real)
├── n8n-workflows/               ← workflows productivos versionados (fuente de verdad)
│   ├── README.md
│   ├── agente-7-actualizador-kb-inteligente.json       (v1)
│   ├── agente-7-actualizador-kb-inteligente.v2.json    (v2 con fixes)
│   ├── notify-slack-on-error.json                      (workflow global de errores)
│   └── scaffolds/                                       (13 scaffolds para reemplazar con JSON real)
│       ├── INDEX.md
│       └── *.scaffold.json
├── n8n-templates/               ← plantillas base reutilizables
│   ├── README.md
│   ├── tpl-agente-sync-bidireccional.json
│   ├── tpl-agente-informe-diario.json
│   ├── tpl-agente-marketing-ia.json
│   └── tpl-agente-optimizador.json
├── scripts/                     ← automatizaciones operativas
│   ├── auditar-fallos.sh                                (diagnóstico del 74.6%)
│   └── generar-scaffolds.py                             (regenera scaffolds desde plantillas)
└── modelo-datos/
    └── README.md                ← entidades CRM, relaciones, IDs estables
```

## Estado actual

| Área | Estado | Detalle |
|---|---|---|
| Workflows productivos | 15 en n8n cloud | 1 versionado real (`Agente 7 v2`) + 13 scaffolds + 1 workflow de errores |
| Tasa de fallo n8n | **74.6%** (170/228) | Crítico — ver `AUDITORIA-FALLOS.md` |
| Sub-agente orquestador | ✅ Elena | `~/.claude/agents/elena.md` |
| MCP n8n | ✅ configurado | Funciona solo en Claude Code local (sandbox bloquea host) |
| Secretos | ✅ separados | `.env` gitignored; ejemplo en `.env.example` |
| Modelo de datos | 🚧 inicial | Ver `modelo-datos/README.md` |

## Cómo trabajar aquí

1. **Para cambios en workflows**: edita el JSON en `n8n-workflows/`, importa en n8n cloud, prueba, commitea aquí.
2. **Para nuevos workflows**: copia una plantilla de `n8n-templates/`, renombra, ajusta nodos, sigue el checklist del README de templates.
3. **Para invocar a Elena**: en una conversación con Claude, usa la herramienta Agent con `subagent_type: elena` y describe el problema completo.
4. **Para auditar fallos**: sigue `AUDITORIA-FALLOS.md` paso a paso.
5. **Commits**: en español, formato Conventional Commits, push a `claude/bac-loyalty-crm-KEMbl`.

## Convenciones

- **Idempotencia**: todo POST hacia API BAC debe enviar header `Idempotency-Key`.
- **PII**: nunca enviar email/teléfono/documento a Claude sin hashear con `PII_SALT`.
- **Versionado de modelo Claude**: usar `claude-opus-4-7` por defecto; fallback `claude-sonnet-4-6`.
- **Confianza mínima IA**: `KB_CONFIDENCE_THRESHOLD=0.6`. Batches por debajo van a rama de descarte.
- **Reintentos**: 3x con backoff exponencial en HTTP nodes.
- **Timeouts**: 30 s para GET, 60 s para POST con Anthropic.
