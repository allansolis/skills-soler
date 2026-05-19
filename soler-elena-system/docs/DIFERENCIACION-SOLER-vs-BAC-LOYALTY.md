# 🔀 Diferenciacion de proyectos — Soler CRM vs BAC Loyalty CRM

**Fecha:** 2026-05-18 (actualizado)
**Contexto:** Allann Solis maneja dos sistemas CRM completamente distintos que comparten el codename "Elena" para el asistente IA. Este documento clarifica las diferencias reales.

---

## ⚡ Resumen ejecutivo

| Aspecto | 🛒 **Soler CRM** | 🛡️ **BAC Loyalty CRM** |
|---------|------------------|-------------------------|
| **Naturaleza** | CRM de ventas retail multi-marca | Sistema de monitoreo Salesforce + Elena KB |
| **Proposito** | Ventas conversacionales 4 negocios | Auditar/monitorear orgs Salesforce de loyalty |
| **Cliente final** | Compradores retail CR | Equipos de desarrollo Salesforce |
| **Asistente Elena** | KB 4 negocios + Sonnet 4.5 | KB 7,400+ lecciones Salesforce + aprendizaje continuo |
| **Stack** | Next.js 16 + Drizzle + Python Flask | Python 3.12 + Flask + Salesforce CLI |
| **Repo** | github.com/allansolis/skills-soler | github.com/allansolis/bac-loyalty-crm |
| **Carpeta local** | `Documents\skills-soler\` | `Documents\bac-loyalty-crm\` |
| **Puerto dev** | :3000 | (Flask local) |
| **Version** | (continua) | v2.9 (mayo 2026) |
| **Estado** | Activo dev | Production status badge |

---

## 🛒 SOLER CRM — Que es

**Sistema de ventas conversacionales con IA** para los 4 negocios del Grupo Soler en Costa Rica.

### Componentes
```
skills-soler/
├── auto-crm/                  Next.js CRM dashboard (puerto 3000)
│   ├── /                      Home con KPIs
│   ├── /leads + /leads-kanban Lead management
│   ├── /analytics             Charts trend/funnel/signals
│   ├── /performance           Bot health + costs
│   └── /ads                   Meta Ads live dashboard
├── soler-elena-system/        Sistema de bots Elena
│   ├── bots/                  4 bots Python Flask (5000-5003)
│   ├── knowledge-bases/       KBs JSON por negocio
│   ├── managed-agent/         Elena en Claude Console
│   ├── meta-config/           Catalogos Meta
│   ├── scripts/               Watchdog, deploy, training
│   └── docs/                  ~25 docs estrategicos
└── [skills marketplace folders] Skills genericas (no parte del CRM)
```

### Los 4 negocios atendidos
- 🛡️ **Glass Soler** — polarizado de seguridad vehicular
- 💎 **Esmeraldas Soler** — joyeria con esmeraldas naturales
- 🚗 **Autos Soler** — compra-venta de vehiculos
- 🏘️ **Inversiones Soler** — asesoria inmobiliaria

### Pipeline tipico
```
Cliente WhatsApp/IG/FB → n8n → Bot Elena → Lead scoring
                                                 ↓
                                       CRM /leads-kanban
                                                 ↓
                                       Handoff humano (si hot)
```

---

## 🛡️ BAC LOYALTY CRM — Que es

**Sistema integral de auditoria, monitoreo y operacion de orgs Salesforce** para programas de loyalty.

> "Sistema integral para auditar, monitorear, documentar y operar orgs Salesforce. Unifica 10+ herramientas en un solo CRM local con asistente Elena (KB de 7,400+ lecciones), analytics live, monitor de seguridad, validador de codigo, auto-backup a 3 destinos, scheduler diario de aprendizaje, HTTP collections (Postman-OSS) y webhooks Slack/Teams."

### Modulos principales
| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Dashboard | `/` | KPIs SVG: findings severidad, flows health, VR decisions |
| Analytics live | `/analytics` | 7 dashboards: miembros, transacciones, divisas, tiers, redemption |
| Shield Monitor | `/shield/monitor` | 10 queries seguridad live + recomendaciones |
| Elena Agent | `/agent` | KB persistente 7,400+ lecciones + aprendizaje continuo |
| Scanner local | `/scanner` | 30 reglas inspired-by PMD (Security/Performance/Design/Style) |
| API Tester | `/http-tester` | HTTP collections Postman-like, stdlib, audit-logged |
| Validador codigo | `/compare` | Diff + validacion estilo changeset |
| Health Dashboard | `/health` | Refresh 10s |
| Audit log | `/audit-log` | Inmutable con hash chain |
| Errores | `/errors` | Causa raiz + solucion + pitfalls por error |

### Capacidades unicas
- 🧪 **API Tester OSS** — Postman-like, stdlib only, zero cloud egress
- 📈 **Elena Self-Improver** — Daily loop con gap detection + quality metrics
- 🦁 **Elena reasoning v3** — BM25F + RRF + phrase matching + MMR + cache
- 🌎 **Form multi-pais** — 6 paises × 4 ambientes (24 URLs)
- 📁 **Credentials Store** — OAuth con 1-click reuse
- 📜 **Audit Log inmutable** — hash chain
- 💾 **Auto-backup a 3 destinos**
- 🚀 **Deep Learn** — 25+ fuentes paralelas
- 📅 **Scheduler diario** — auto-aprendizaje 24h
- 🦁 **Slash commands** — Ctrl+K → /help /backup /sync /stats
- 🔗 **Citations en chat** — fuente + URL + tags por respuesta
- 🔔 **Webhooks Slack/Teams**
- ✅ **Smoke tests** — 35/35 PASS

### Tecnologia
- Python 3.12 + Flask
- Salesforce CLI + sfdx-scanner
- Java JDK 21
- Node.js LTS
- Git LFS (metadata 1.1 GB)
- n8n para workflows

### Distribucion
- Instalador Windows: `CRM-SalesForce-Solution.exe` (45 KB)
- 1 doble-click → instala todo (Python, Java, Node, Git, SF CLI, n8n)
- PWA instalable
- Replicable Linux/Mac/WSL via `REPLICAR_EN_OTRA_PC.md`

---

## 🔍 Diferencias criticas

### En naturaleza
| Soler CRM | BAC Loyalty CRM |
|-----------|------------------|
| CRM **operativo** (gestiona leads/ventas) | Sistema **meta-CRM** (audita CRMs Salesforce de terceros) |
| Centro de control comercial | Centro de control tecnico/devops |
| Datos: contactos, deals, conversaciones | Datos: findings, flows, validaciones, lecciones KB |

### En usuarios
| Soler CRM | BAC Loyalty CRM |
|-----------|------------------|
| Vendedor / operador comercial | Developer / admin Salesforce / auditor |
| Acceso movil/PC operador | Acceso PC tecnico + acceso movil opcional |
| Foco UX simple para no-tecnicos | Foco UX denso para devs |

### En IA (ambos tienen "Elena")
| Elena en Soler CRM | Elena en BAC Loyalty CRM |
|--------------------|---------------------------|
| Bot conversacional ventas | Asistente tecnico Salesforce |
| KB: productos/precios/objeciones 4 negocios | KB: 7,400+ lecciones Salesforce best practices |
| Modelo: Claude Sonnet 4.5 + Haiku router | Reasoning v3: BM25F + RRF + phrase matching |
| Aprende de KB JSON editable manual | Self-improver con daily loop + quality metrics |
| Responde a clientes finales | Responde a developers que auditan |

### En seguridad/compliance
| Soler CRM | BAC Loyalty CRM |
|-----------|------------------|
| Webhook secret + .env | OAuth multi-pais, credentials store, audit log inmutable |
| Logs locales | Hash chain immutable + auto-backup 3 destinos |

### En distribucion
| Soler CRM | BAC Loyalty CRM |
|-----------|------------------|
| Repo + manual setup | Installer .exe one-click + PWA |
| Para Allann + equipo Soler | Para Allann (autor unico) + clientes Salesforce |

---

## 🌍 Lo unico que comparten

1. **Codename "Elena"** para el asistente IA (pero implementaciones muy distintas)
2. **Allann Solis** como autor principal
3. **Costa Rica** como mercado objetivo
4. **Stack inicial Python** (aunque Soler agrego Next.js encima)
5. **Filosofia** de aprendizaje continuo / IA aumentando humanos

---

## 🚫 Que NO compartir entre proyectos

### Soler → NO copiar a BAC
- ❌ Schema Drizzle (BAC usa otro modelo)
- ❌ KBs JSON 4 negocios (BAC tiene su propia KB Salesforce)
- ❌ Bots Python Flask de WhatsApp (BAC no atiende clientes finales)
- ❌ Meta Ads integration (BAC no compra ads)
- ❌ Lead scoring conversacional (BAC no genera leads, audita codigo)

### BAC → NO copiar a Soler
- ❌ Salesforce CLI integration
- ❌ Scanner 30 reglas PMD
- ❌ HTTP Tester Postman-OSS (Soler usa Postman normal si necesita)
- ❌ Shield Monitor queries (no aplica retail)
- ❌ Elena KB 7,400+ Salesforce lessons (Soler tiene KB ventas)
- ❌ Installer .exe (Soler no se distribuye masivo)

---

## ✅ Estructura final aclarada

```
C:\Users\Usuario\Documents\
├── skills-soler\               ← SOLER CRM (retail multi-brand)
│   ├── auto-crm\
│   ├── soler-elena-system\
│   └── [skills folders]
│
└── bac-loyalty-crm\            ← BAC LOYALTY CRM (Salesforce monitoring)
    ├── crm_app\
    ├── bac_auditor\
    ├── docs\
    ├── ELENA_KB.md
    └── CRM-SalesForce-Solution.exe
```

```
GitHub:
├── allansolis/skills-soler           ← Soler CRM
└── allansolis/bac-loyalty-crm        ← BAC Loyalty CRM (main + feat/llm-integration)
```

---

## 🎯 Si trabajas en uno, NO toques el otro

### Sesion enfocada Soler
```bash
cd C:\Users\Usuario\Documents\skills-soler
# Trabajar aqui SOLO
```

### Sesion enfocada BAC Loyalty
```bash
cd C:\Users\Usuario\Documents\bac-loyalty-crm
# Trabajar aqui SOLO
```

### Ambos abiertos para referencia
Pero NUNCA hacer pull requests cross-repo. Son sistemas independientes con releases/versiones propias.

---

**Mantenedor:** Allann Solis
**Doc generado:** 2026-05-18 por Claude
**Proxima revision:** cuando alguno de los proyectos cambie naturaleza
