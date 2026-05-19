# CRM Soler — Automatización completa

> El CRM se auto-instala, auto-actualiza, auto-sincroniza y auto-recupera.
> Tu intervención requerida: cero (en operación normal).

## 🤖 Lo que el sistema hace solo

| Cuándo | Qué pasa | Script |
|--------|----------|--------|
| **Al prender la PC** | Levanta CRM en :3000 + Cloudflare tunnel | `Startup/CRM-Soler-AutoStart.vbs` |
| **6:00 AM diario** | `git pull` + `npm install` (si cambió) + restart | `scripts/automation/daily-update.bat` |
| **9:00 AM diario** | Extracción Meta (FB+IG+WA) → DB | `scripts/automation/sync-meta.bat` |
| **6:00 PM diario** | Extracción Meta (FB+IG+WA) → DB | `scripts/automation/sync-meta.bat` |
| **Cada 5 minutos** | Health check → restart si CRM o tunnel cayeron | `scripts/automation/health-check.bat` |

## 📂 Estructura de archivos de automatización

```
auto-crm/
├── scripts/automation/
│   ├── start-all.bat           ← Levanta CRM + tunnel
│   ├── daily-update.bat        ← git pull + npm install + restart
│   ├── sync-meta.bat           ← Corre meta_full_extract.py
│   ├── health-check.bat        ← Watchdog (auto-restart)
│   ├── install-tasks.bat       ← Registrar tareas en Task Scheduler
│   └── install-tasks.ps1       ← Alternativa con PowerShell (necesita admin)
└── logs/
    ├── start-all.log
    ├── crm.log
    ├── tunnel.log
    ├── daily-update.log
    ├── sync-meta.log
    └── health.log

C:\Users\Usuario\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
└── CRM-Soler-AutoStart.vbs     ← Launch al login (silencioso)
```

## 🛠️ Setup en una máquina nueva

```bash
# 1. Clonar repos (ver INSTALL.md)
git clone https://github.com/allansolis/skills-soler.git
cd skills-soler/auto-crm
npm install
cp .env.example .env.local
# Editar .env.local con secrets de Drive

# 2. Registrar tareas programadas
scripts\automation\install-tasks.bat

# 3. Copiar VBS a Startup folder (auto-start al login)
copy scripts\automation\CRM-Soler-AutoStart.vbs ^
  "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"

# 4. Verificar
schtasks /Query /TN "CRM Soler*"
```

## 📊 Monitoreo

### Dashboard en CRM
Abrí http://localhost:3000/status — muestra:
- ✅/❌ DB, Anthropic, Meta tokens, webhook config, KBs
- Uptime
- Mensajes recientes (24h)
- Tabla de tareas programadas con frecuencia

### Endpoint health
```bash
curl http://localhost:3000/api/health
```
Devuelve `200` si todo OK, `503` si algo está degradado.

### Logs
```powershell
cd C:\Users\Usuario\Documents\skills-soler\auto-crm\logs
Get-Content health.log -Tail 20 -Wait    # En vivo
```

## ⚙️ Operaciones manuales

```bash
# Correr update ahora (no esperar a las 6am)
schtasks /Run /TN "CRM Soler - Daily Update"

# Forzar sync Meta ahora
schtasks /Run /TN "CRM Soler - Meta Sync 9am"

# Detener una tarea
schtasks /End /TN "CRM Soler - Health Check"

# Borrar todas las tareas (uninstall automatización)
schtasks /Delete /TN "CRM Soler - Daily Update" /F
schtasks /Delete /TN "CRM Soler - Meta Sync 9am" /F
schtasks /Delete /TN "CRM Soler - Meta Sync 6pm" /F
schtasks /Delete /TN "CRM Soler - Health Check" /F
```

## 🔧 Comportamiento del watchdog

**`health-check.bat` corre cada 5 minutos**. Si:

- `/api/health` no responde 200 → mata procesos node + relanza `start-all.bat`
- `cloudflared.exe` no está en tasklist → relanza tunnel

Esto garantiza que el sistema **se auto-cura** en máximo 5 minutos ante:
- Cuelgues de Next.js
- Crashes de node
- Cierres accidentales del tunnel
- OOM (out of memory)
- Reboots inesperados

## 🌅 Flujo de mañana típico (sin tu intervención)

```
05:00 — PC encendida (o reboot por updates Windows)
05:01 — Startup VBS → start-all.bat → CRM en :3000 + tunnel ON
06:00 — Daily Update: git pull desde GitHub
        ├── Si hay cambios: npm install + restart automático
        └── Si no: nada, sigue corriendo
06:05 — Health check confirma todo OK
09:00 — Meta Sync 9am: extrae posts/videos/conversaciones nuevas
        └── 236 assets + nuevas conversaciones inbound se insertan en DB
09:05 — Health check OK
...    — (sistema sirviendo CRM, Elena respondiendo mensajes que lleguen)
18:00 — Meta Sync 6pm: segunda extracción del día
18:05 — Health check OK
```

Tú abrís el CRM en cualquier momento del día y todo está fresco.

## 🚨 Troubleshooting

### CRM no levantó al login
- Verificar que el VBS exista: `dir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CRM-Soler-AutoStart.vbs"`
- Probar manualmente: doble click en el VBS
- Ver `logs/start-all.log`

### Daily update no corrió
- Verificar tarea: `schtasks /Query /TN "CRM Soler - Daily Update"`
- Última ejecución: `schtasks /Query /TN "CRM Soler - Daily Update" /V /FO LIST`
- Si Last Result no es 0, ver `logs/daily-update.log`

### Meta sync devuelve errores de permisos
- Tokens expiraron (raro, son long-lived). Regenerar con script de obtención de tokens.
- Verificar `.env.local` tiene los 4 `META_PAGE_TOKEN_*` y `META_ACCESS_TOKEN`

### Health endpoint dice "degraded"
- Abrir http://localhost:3000/status para ver cuál check falla
- Las causas comunes: DB lock, env var faltante, KB md borrado
