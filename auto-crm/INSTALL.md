# CRM SOLER — Guía de instalación

> Levantar el CRM Soler desde cero en una máquina nueva.
> Tiempo estimado: 15-20 min.

## Prerequisitos

- **Node.js 20+** (o 22 LTS)
- **Git**
- **Python 3.12+** (solo si vas a correr los scripts de extracción Meta)
- Cuenta Anthropic con saldo (https://console.anthropic.com)
- Cuenta Meta Developers + App "Soler" + Page tokens

## 1. Clonar repos

```bash
mkdir -p ~/soler && cd ~/soler

# CRM principal (este repo)
git clone https://github.com/allansolis/skills-soler.git

# Sistema Elena (CRM-Soler — bots Python + Elena agent)
git clone https://github.com/allansolis/CRM-Soler.git
```

## 2. Instalar dependencias

```bash
cd ~/soler/skills-soler/auto-crm
npm install
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local` y pegá los valores reales que están en tu **Drive**:
`Drive > Soler > CRM-Soler > secrets > .env.local.production`

Variables críticas mínimas para arrancar:
- `META_ACCESS_TOKEN`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_PAGE_TOKEN_GLASS|ESMERALDAS|AUTOS|INVERSIONES`
- `ANTHROPIC_API_KEY`

## 4. Inicializar base de datos

```bash
npm run init
```

Esto crea `data/crm.db` con schema + pipeline stages default.

Opcional: cargar datos seed (4 contactos demo, 4 conversaciones):
```bash
npm run init:seed
```

## 5. Levantar el servidor

```bash
npm run dev
```

Abrir http://localhost:3000

## 6. Verificar todo funciona

```bash
# Health check del env
curl http://localhost:3000/api/debug-env

# Test Elena (playground)
curl -X POST http://localhost:3000/api/elena/test \
  -H "Content-Type: application/json" \
  -d '{"business":"glass_soler","message":"Hola, info polarizado"}'
```

Si Elena responde con texto contextual de Glass → todo OK.

## 7. Exponer webhook (para recibir mensajes reales)

```bash
# Cloudflare tunnel (gratis, sin login)
cloudflared tunnel --url http://localhost:3000

# La URL output (https://<random>.trycloudflare.com) la pegas en:
# developers.facebook.com → App Soler → Webhooks → Edit
#   Callback URL: https://<url>.trycloudflare.com/api/meta/webhook
#   Verify token: el valor de META_VERIFY_TOKEN
```

## 8. Suscribir 4 pages al app (una sola vez)

```bash
cd ~/soler/skills-soler
python ../CRM-Soler/scripts/subscribe_pages_webhook.py
```

## Estructura del proyecto

```
skills-soler/
├── auto-crm/                        ← Next.js CRM (este)
│   ├── src/
│   │   ├── app/                     ← Páginas + API routes
│   │   ├── lib/elena/               ← Bot Elena (KB + Anthropic + send)
│   │   ├── lib/businessConfig.ts    ← Single source 4 marcas
│   │   ├── db/schema.ts             ← Drizzle schema
│   │   └── context/                 ← BusinessContext
│   ├── data/crm.db                  ← SQLite (NO commiteable)
│   └── .env.local                   ← Secrets (NO commiteable)
│
└── soler-elena-system/              ← Sistema Python + n8n (CRM-Soler repo)
    └── ...
```

## Solución de problemas

### "ANTHROPIC_API_KEY missing"
Windows puede tener una env var del sistema vacía. El código usa `getEnv()` (en `src/lib/elena/env.ts`) que cae al `.env.local` directamente. Si aún falla, ejecutá:
```bash
setx ANTHROPIC_API_KEY ""
```
Y reiniciá la terminal.

### Webhook responde 401
`META_APP_SECRET` no coincide con el del app. Verificá en developers.facebook.com → tu app → Settings → Basic.

### "send failed: No se ha encontrado al usuario coincidente"
Regla de ventana 24h de Meta: el usuario debe haberle escrito a la page primero. Si lo estás testeando con user IDs sintéticos, fallará — es esperado.

### Build error
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Backups

- **GitHub:** https://github.com/allansolis/skills-soler (privado)
- **Drive:** `My Drive > Soler > CRM-Soler/` (mirror full)
- **Local:** `C:\Users\Usuario\Documents\skills-soler/`

Ver `BACKUP-INDEX.md` en la raíz para el estado del último backup.
