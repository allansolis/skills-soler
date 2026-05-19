@echo off
:: =============================================================
:: CRM Soler - Auto-start completo (CRM + Tunnel + Watchdog)
:: Llamado al login de Windows via Task Scheduler.
:: =============================================================

set CRM_DIR=C:\Users\Usuario\Documents\skills-soler\auto-crm
set LOG_DIR=C:\Users\Usuario\Documents\skills-soler\auto-crm\logs

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

cd /d "%CRM_DIR%"

echo [%date% %time%] === START-ALL invoked === >> "%LOG_DIR%\start-all.log"

:: Matar cualquier instancia previa en puerto 3000 (cleanup)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [%date% %time%] Killing existing node PID %%a >> "%LOG_DIR%\start-all.log"
  taskkill /F /PID %%a >nul 2>&1
)

:: Matar tunnel previo
taskkill /F /IM cloudflared.exe >nul 2>&1

timeout /t 2 /nobreak >nul

:: Start CRM en background (production o dev?). Usamos dev para hot-reload.
echo [%date% %time%] Starting CRM dev server >> "%LOG_DIR%\start-all.log"
start "CRM Soler" /MIN cmd /c "cd /d %CRM_DIR% && npm run dev >> %LOG_DIR%\crm.log 2>&1"

:: Esperar que CRM levante
timeout /t 15 /nobreak >nul

:: Start Cloudflare tunnel
echo [%date% %time%] Starting Cloudflare tunnel >> "%LOG_DIR%\start-all.log"
start "Tunnel" /MIN cmd /c "cloudflared tunnel --url http://localhost:3000 >> %LOG_DIR%\tunnel.log 2>&1"

echo [%date% %time%] === START-ALL complete === >> "%LOG_DIR%\start-all.log"

exit /b 0
