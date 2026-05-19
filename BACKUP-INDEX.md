# BACKUP INDEX — Soler Ecosystem

> Última actualización: 2026-05-19
> Estado: ✅ Sistema completo guardado en GitHub + Drive + Local

## Ubicaciones de respaldo

### 1. GitHub (público origen)

| Repo | URL | Privado |
|------|-----|---------|
| skills-soler | https://github.com/allansolis/skills-soler | sí |
| CRM-Soler | https://github.com/allansolis/CRM-Soler | sí |
| bac-loyalty-crm | https://github.com/allansolis/bac-loyalty-crm | sí |

### 2. Google Drive (mirror manual)

```
My Drive
└── Soler/
    ├── CRM-Soler/                        ← mirror del repo
    ├── secrets/
    │   ├── .env.local.production         ← Variables reales
    │   ├── meta_app_credentials.txt
    │   ├── anthropic_keys.txt
    │   └── page_tokens.txt
    └── docs/
        ├── INSTALL.md                    ← copia desde repo
        ├── ARQUITECTURA.md
        └── ELENA-PERSONAS.md
```

### 3. Local (Windows)

```
C:\Users\Usuario\Documents\
├── skills-soler\                         ← Repo principal (CRM Next.js + Elena)
└── CRM-Soler\                            ← Sistema Python bots Elena

C:\Users\Usuario\Desktop\Bot glass soler\  ← Scripts auxiliares + .env (NO repo)
```

## Estado de los repos

### skills-soler
- **Files tracked:** 26,495
- **Repo size:** 146 MB (.git)
- **Last commit:** Pending — quedan 49 archivos sin commit (este backup)
- **Branch:** master
- **Remote:** origin → github.com/allansolis/skills-soler.git

### CRM-Soler
- **Files tracked:** 381
- **Repo size:** 2.4 MB (.git)
- **Last commit:** `d859e47 feat(meta-fixes): aplicar fixes Autos + Inversiones via Graph API`
- **Branch:** master
- **Remote:** origin → github.com/allansolis/CRM-Soler.git

## Componentes críticos del sistema

| Componente | Ubicación | Backup |
|-----------|-----------|--------|
| Next.js CRM (UI + API) | `skills-soler/auto-crm/` | git + drive |
| Elena bot lib | `skills-soler/auto-crm/src/lib/elena/` | git + drive |
| Knowledge bases (4 marcas) | `skills-soler/auto-crm/src/lib/elena/kb/` | git + drive |
| Webhook receiver | `skills-soler/auto-crm/src/app/api/meta/webhook/` | git + drive |
| Schema Drizzle | `skills-soler/auto-crm/src/db/schema.ts` | git + drive |
| SQLite DB | `skills-soler/auto-crm/data/crm.db` | **drive only** (gitignored) |
| Meta audit JSON | `skills-soler/auto-crm/data/meta-audit/` | **drive only** |
| Secrets (.env.local) | `skills-soler/auto-crm/.env.local` | **drive secrets/ only** |
| Bots Python (4 elenas) | `CRM-Soler/soler-elena-system/bots/` | git + drive |
| Scripts extracción Meta | `Desktop/Bot glass soler/*.py` | local + drive (no repo) |
| n8n workflows JSON | `CRM-Soler/soler-elena-system/n8n/` | git + drive |

## Secrets fuera de git (deben guardarse APARTE)

```
META_ACCESS_TOKEN              (long-lived, app Soler)
META_ADS_TOKEN_INVERSIONES     (long-lived, app Soler Inversiones)
META_APP_SECRET                (app Soler)
META_APP_SECRET_INVERSIONES    (app Soler Inversiones)
META_CLIENT_TOKEN              (Soler)
META_CLIENT_TOKEN_INVERSIONES  (Soler Inversiones)
META_PAGE_TOKEN_GLASS          (long-lived, never expires)
META_PAGE_TOKEN_ESMERALDAS     (long-lived, never expires)
META_PAGE_TOKEN_AUTOS          (long-lived, never expires)
META_PAGE_TOKEN_INVERSIONES    (long-lived, never expires)
META_WA_TOKEN                  (Bearer token WhatsApp)
META_WA_PHONE_ID_TEST          (phone_number_id)
META_WA_WABA_ID_TEST           (WABA ID)
ANTHROPIC_API_KEY              (con saldo cargado)
ANTHROPIC_MODEL=claude-sonnet-4-5
```

**Guardar en:** Google Drive → `Soler/secrets/.env.local.production`

## Cómo restaurar el sistema desde cero

Ver `auto-crm/INSTALL.md` para guía paso a paso.

Resumen:
```bash
git clone https://github.com/allansolis/skills-soler.git
git clone https://github.com/allansolis/CRM-Soler.git
cd skills-soler/auto-crm
cp .env.example .env.local
# Editar .env.local con valores de Drive > Soler > secrets/
npm install
npm run init
npm run dev
```

## Histórico de eventos importantes

| Fecha | Evento |
|-------|--------|
| 2026-05-13 | Bot Elena entrenamiento APROBADO |
| 2026-05-17 | Repo bac-loyalty-crm separado |
| 2026-05-18 (am) | Repo CRM-Soler creado limpio |
| 2026-05-18 (pm) | Meta tokens long-lived generados, todas las pages conectadas |
| 2026-05-18 (noche) | Auditoría Autos + Inversiones, fixes aplicados |
| 2026-05-19 (am) | Switcher de business + filtrado por marca en todas secciones |
| 2026-05-19 (am) | Wave 1+2+3: data integrity + central config + filtros API |
| 2026-05-19 (md) | Extracción Meta completa (236 assets) |
| 2026-05-19 (md) | Webhook unificado FB+IG+WA + Elena multi-business |
| 2026-05-19 (md) | E2E test 11/12 pass — sistema validado |
| 2026-05-19 (md) | Page tokens long-lived agregados + pages suscritas |

## Próximos pasos (cuando retomes)

- [ ] Probar webhook real: mandar mensaje desde Messenger a Glass Soler
- [ ] Migrar WhatsApp test number a número productivo
- [ ] Migrar de Cloudflare tunnel a deploy en Vercel/Railway/Fly.io
- [ ] Importar workflows n8n para Autos e Inversiones (task #17 pendiente)
- [ ] Crear bot productivo Elena en Anthropic Console (uno por marca o managed agent)
- [ ] Solicitar App Review en Meta para `pages_messaging` + `instagram_manage_messages` (5-7 días)
