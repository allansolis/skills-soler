# CLAUDE.md — Auto-CRM

> Este es un CRM completo y local que se personaliza a cada negocio.
> Cuando un usuario abre este proyecto con Claude Code, tu trabajo es ayudarle a configurarlo,
> usarlo, y expandirlo segun sus necesidades. Todo corre en su maquina — sin servicios externos.

## Inicio rapido para el usuario

Si es la primera vez que el usuario abre el proyecto, guialo con estos pasos:

1. `npm install` — Instalar dependencias
2. `npm run init:seed` — Inicializar base de datos con datos demo
3. `npm run dev` — Iniciar servidor en http://localhost:3000
4. Ejecutar `/setup` para personalizar el CRM a su negocio

## Comandos

```bash
npm run dev          # Servidor de desarrollo (http://localhost:3000)
npm run build        # Build de produccion
npm start            # Servidor de produccion
npm run local        # Build + init + start (despliegue local en un comando)
npm run init         # Inicializar base de datos
npm run init:seed    # Inicializar + datos demo
npm run seed         # Solo datos demo
npm run lint         # ESLint
npm run mcp          # Iniciar servidor MCP (para Claude Desktop/Web)
```

## Comandos interactivos disponibles

| Comando | Que hace |
|---------|----------|
| `/setup` | Personalizar CRM: pipeline, fuentes de leads, industria, idioma, tema |
| `/add-lead` | Agregar un lead conversacionalmente — describe al prospecto y se crea automaticamente |
| `/analyze-pipeline` | Analisis completo del pipeline con recomendaciones accionables |
| `/daily-briefing` | Resumen ejecutivo del dia: follow-ups, deals calientes, prioridades |
| `/import-contacts` | Importar contactos desde un archivo CSV |
| `/customize` | Cambiar configuracion sin reiniciar todo |
| `/connect` | Conectar CRM con Gmail, Calendar, Sheets, WhatsApp via MCP |
| `/digest` | Enviar resumen diario por email (requiere Resend) |

## Arquitectura

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · SQLite + Drizzle ORM · @dnd-kit (kanban)

**100% local**: SQLite como base de datos (archivo en `data/crm.db`). No requiere ningun servicio externo.

**Alias**: `@/*` → `./src/*`

### Directorios clave

- `src/app/` — Paginas y API routes (App Router)
- `src/components/` — Componentes React organizados por feature
- `src/db/` — Schema Drizzle, cliente DB, seeder
- `src/lib/` — Utilidades: claude.ts (AI), scoring.ts, constants.ts
- `src/types/` — TypeScript types para entidades CRM
- `.claude/commands/` — Comandos interactivos (los de la tabla arriba)
- `mcp/` — Servidor MCP para integracion con Claude Desktop/Web
- `scripts/` — Scripts de inicializacion y utilidades

### Modelo de datos

- **Contacts**: Leads con temperatura (frio/tibio/caliente), score, fuente, historial
- **Deals**: Oportunidades de venta con valor (en centavos), etapa, probabilidad
- **Activities**: Interacciones (llamada/email/reunion/nota/follow-up) con fechas
- **Pipeline Stages**: Etapas configurables del pipeline de ventas
- **CRM Settings**: Configuracion key-value

### API Routes

| Endpoint | Metodos | Descripcion |
|----------|---------|-------------|
| `/api/contacts` | GET, POST | Listar (con busqueda/filtro) y crear contactos |
| `/api/contacts/[id]` | GET, PUT, DELETE | CRUD individual de contacto |
| `/api/deals` | GET, POST | Listar y crear deals |
| `/api/deals/[id]` | GET, PUT, DELETE | CRUD individual de deal |
| `/api/activities` | GET, POST | Listar y registrar actividades |
| `/api/activities/[id]` | PUT, DELETE | Completar o eliminar actividad |
| `/api/pipeline` | GET, PUT | Pipeline completo; mover deals entre etapas |
| `/api/classify` | POST | Clasificar lead (IA o reglas) |
| `/api/followups` | GET | Follow-ups pendientes (vencidos, hoy, proximos) |
| `/api/import` | POST | Importacion masiva de contactos |
| `/api/webhook` | POST | Recibir leads de formularios externos (Typeform, Tally, etc.) |
| `/api/export` | GET | Exportar contactos o deals como CSV (?type=contacts o deals) |
| `/api/digest` | POST | Enviar resumen diario por email (requiere RESEND_API_KEY) |

## Configuracion del negocio

El archivo `crm-config.json` (raiz del proyecto) tiene la configuracion personalizada.
Se genera con `/setup` y se modifica con `/customize`.

El archivo en `public/crm-config.json` es la copia por defecto (template).

## Reglas de codigo

- **Idioma UI**: Espanol por defecto. Soporte bilingue con `const t = { en: {...}, es: {...} }`
- **Max ~300 lineas por componente**. Dividir si crece mas
- **No emojis como iconos** — usar Lucide React (SVG)
- **Valores monetarios**: Centavos (integer). Usar `formatCurrency()` para mostrar
- **Fechas**: `date-fns` para formateo. SQLite almacena como integer timestamps
- **Forms**: react-hook-form + zod
- **Drag & drop**: @dnd-kit (NO react-beautiful-dnd)
- **Estilos**: Tailwind CSS v4 (config via CSS, no tailwind.config.ts)

## Modos de IA

1. **Terminal Mode** (default, sin API key): Toda la IA via tus comandos de Claude Code.
   El usuario describe lo que necesita, tu lees/escribes datos via `curl` a los API routes.

2. **API Mode** (opcional): Si el usuario pone `ANTHROPIC_API_KEY` en `.env.local`,
   la web tiene clasificacion automatica de leads inline.

3. **MCP Mode**: El usuario puede conectar Claude Desktop/Web al CRM via el servidor MCP.
   Config: `npm run mcp` o agregar a `claude_desktop_config.json`.

**Sin API key, el CRM funciona 100%.** La IA es un extra, no un requisito.

## Despliegue

### Local (desarrollo)
```bash
npm run dev
```

### Local (produccion)
```bash
npm run local  # build + init + start en puerto 3000
```

### Docker
```bash
docker compose up -d  # Corre en puerto 3000, datos persisten en ./data/
```

### MCP (Claude Desktop/Web)
Agregar a `~/.claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "auto-crm": {
      "command": "npx",
      "args": ["tsx", "/ruta/al/proyecto/mcp/crm-server.ts"]
    }
  }
}
```

## Variables de entorno

Local dev usa **`.env`** (NO `.env.local`). Vercel CLI puede dejar lock
huerfano sobre `.env.local` que Windows no libera; usar `.env` evita el problema.
Next.js, drizzle-kit y nuestros scripts cargan `.env` por defecto via dotenv.

Vars principales:

- `ANTHROPIC_API_KEY` — Para Elena (Anthropic Messages API)
- `ANTHROPIC_MODEL` — Default: `claude-sonnet-4-5`
- `META_APP_ID`, `META_APP_SECRET` — Validar firma HMAC del webhook
- `META_VERIFY_TOKEN` — Token compartido con developers.facebook.com
- `META_ACCESS_TOKEN` — User token para Graph API (leer pages, ads)
- `META_PAGE_TOKEN_<BIZ>` — Token long-lived por pagina para enviar mensajes
- `META_PAGE_ID_<BIZ>` — IDs Facebook page por marca (glass/esmeraldas/autos/inversiones)
- `META_WA_TOKEN`, `META_WA_PHONE_ID_TEST`, `META_WA_WABA_ID_TEST` — WhatsApp Business
- `TURSO_DATABASE_URL` — libsql://...turso.io (vacio = local file)
- `TURSO_AUTH_TOKEN` — JWT generado en app.turso.tech
- `WEBHOOK_SECRET` — Opcional, autentica /api/webhook (formularios externos)
- `RESEND_API_KEY`, `DIGEST_EMAIL`, `DIGEST_FROM` — Opcional, digest diario

## Deploy a Vercel (productivo)

Repo: `allansolis/skills-soler` (subfolder `auto-crm/` como root directory).
Project Vercel: `crm-soler` (team `allannsolis94-3085s-projects`).

Comandos:
```bash
vercel login                # device auth via browser
vercel link --project crm-soler --yes
vercel env add NAME production       # uno por uno, valor via stdin
vercel --prod --yes                  # build + deploy
```

Para push masivo de env vars desde `.env`:
```bash
bash scripts/vercel-env-push.ps1     # lee .env y pushea c/u a production
```

URL productiva: https://crm-soler.vercel.app
Webhook Meta: https://crm-soler.vercel.app/api/meta/webhook
