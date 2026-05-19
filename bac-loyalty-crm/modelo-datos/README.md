# Modelo de datos canónico — BAC Loyalty CRM

Entidades y relaciones que el CRM espera consumir/producir contra API BAC.

## Entidades principales

### Contact (contacto del programa de lealtad)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | estable, único |
| email | string | PII — nunca enviar a IA sin hashear |
| phone | string | PII |
| document | string | PII (cédula/DNI) |
| nombre | string | PII |
| segment | string | RFM/comportamiento (`new`, `loyal`, `at_risk`, `churned`) |
| tier | string | nivel del programa (`bronze`, `silver`, `gold`, `platinum`) |
| puntos_balance | int | balance actual |
| puntos_vencen | date | fecha de vencimiento del balance |
| marca | enum | `glass-soler` \| `esmeralda` |
| status | enum | `active` \| `inactive` \| `blocked` |
| created_at | ISO datetime | |
| updated_at | ISO datetime | usado para sincronización |

### Conversation (interacción con cliente)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| contact_id | UUID | FK → Contact |
| channel | enum | `whatsapp` \| `email` \| `chat` \| `voice` \| `sms` |
| messages | array | objetos `{role, content, timestamp}` |
| tags | array<string> | clasificación |
| resolved | boolean | resuelta o no |
| created_at | ISO datetime | |

### Campaign (campaña de marketing)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| nombre | string | |
| marca | enum | `glass-soler` \| `esmeralda` |
| segmento_id | UUID | FK → Segment |
| canal | enum | `email` \| `push` \| `sms` \| `whatsapp` |
| status | enum | `draft` \| `running` \| `paused` \| `completed` |
| presupuesto | decimal | |
| presupuesto_gastado | decimal | |
| metricas | object | `{impressions, clicks, ctr, conversions, conversion_rate, revenue}` |

### Segment (segmento de clientes)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| nombre | string | |
| criterios | object | JSON definiendo la query |
| size | int | conteo cacheado |
| tier | enum | tier dominante del segmento |
| marca | enum | |

### KBDocument (entrada en base de conocimiento)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| batch_id | string | agrupador del workflow KB |
| titulo | string | |
| contenido | string (markdown) | |
| tipo | enum | `faq` \| `procedure` \| `kb_analysis` |
| confianza | float | 0.0 - 1.0 |
| metadata | object | |
| created_at | ISO datetime | |

## Relaciones

```
Contact 1───* Conversation
Contact *───* Segment      (via SegmentMembership)
Segment 1───* Campaign
Campaign 1───* CampaignEvent (impression, click, conversion)
Conversation *───* KBDocument (via análisis Agente 7)
```

## Convenciones de IDs

- Todos los IDs son UUIDv4.
- `batch_id` de workflows: `<tipo>-<ISO timestamp truncado a la ventana>` (ej. `kb-2026-05-19T00-00-00Z`).
- `Idempotency-Key` para POSTs: `<batch_id>-<destino_logico>`.

## Endpoints esperados en API BAC

| Método | Path | Uso |
|---|---|---|
| GET | `/contacts/active?status=active&limit=N&cursor=…` | Listar contactos activos paginado |
| GET | `/conversations/recent?since=ISO&cursor=…` | Conversaciones desde timestamp |
| GET | `/campaigns/running` | Campañas activas |
| GET | `/campaigns/{id}/metrics` | Métricas en vivo de una campaña |
| GET | `/campaigns/performance?marca=&since_hours=` | Performance histórica |
| GET | `/segments/active?marca=` | Segmentos vigentes |
| GET | `/metrics/daily?from=ISO&to=ISO` | KPIs diarios |
| POST | `/kb/aggregate` | Push agregado de KB |
| POST | `/kb/local/update` | Update KB local |
| POST | `/kb/documents` | Crear documento KB |
| POST | `/marketing/insights` | Persistir insights de Cerebro Marketing |
| POST | `/campaigns/{id}/actions` | Aplicar acción de optimizador |
| POST | `/audit/optimizer` | Auditar decisión del optimizador |
| POST | `/reports/daily` | Guardar informe diario |
| PUT | `/contacts/{id}` | Actualizar contacto (sync bidireccional) |

Todos los POST/PUT deben soportar header `Idempotency-Key`.

## Pendientes de confirmar con Allan

- [ ] ¿`marca` es un campo separado o se infiere por workspace?
- [ ] ¿Existe entidad `LoyaltyTransaction` (canjes/acumulaciones) o se modela como `CampaignEvent`?
- [ ] ¿Política de vencimiento de puntos: rolling 12 meses o calendario?
- [ ] ¿Glass Soler y Esmeralda comparten contactos o son universos separados?
