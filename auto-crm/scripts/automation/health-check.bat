@echo off
:: =============================================================
:: CRM Soler - Health check + auto-restart
:: Corre cada 5 minutos. Si CRM o tunnel cayeron, los levanta.
:: =============================================================

set CRM_DIR=C:\Users\Usuario\Documents\skills-soler\auto-crm
set LOG_FILE=%CRM_DIR%\logs\health.log

:: 1. Verificar CRM
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/health > "%TEMP%\crm_status.txt"
set /p CRM_HTTP=<"%TEMP%\crm_status.txt"

if not "%CRM_HTTP%"=="200" (
  echo [%date% %time%] CRM DOWN (HTTP %CRM_HTTP%), restarting... >> "%LOG_FILE%"
  call "%CRM_DIR%\scripts\automation\start-all.bat"
  exit /b 0
)

:: 2. Verificar Cloudflare tunnel proceso
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr cloudflared.exe >nul
if errorlevel 1 (
  echo [%date% %time%] Tunnel DOWN, restarting... >> "%LOG_FILE%"
  start "Tunnel" /MIN cmd /c "cloudflared tunnel --url http://localhost:3000 >> %CRM_DIR%\logs\tunnel.log 2>&1"
)

exit /b 0
