@echo off
REM ==========================================================
REM  Arranca el ecosistema Soler completo
REM  - CRM Next.js (port 3000)
REM  - Bot Elena Glass Soler (port 5001)
REM  - Bot Elena Esmeraldas (port 5000)
REM  - Cloudflare Tunnel (URL publica)
REM ==========================================================

setlocal
cd /d "%~dp0"

echo.
echo ================================================================
echo          ECOSISTEMA SOLER - Iniciando servicios
echo ================================================================
echo.

REM --- 1. Kill existing instances to avoid port conflicts ---
echo [1/5] Liberando puertos 3000, 5000, 5001, 5678...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM --- 2. Start Glass Soler Bot ---
echo [2/5] Iniciando Bot Elena Glass Soler (puerto 5001)...
start "Elena Glass Soler" /MIN cmd /c "cd /d C:\Users\Usuario\Desktop\Bot glass soler && python bot_glass.py > bot_glass.log 2>&1"
timeout /t 3 /nobreak >nul

REM --- 3. Start Esmeraldas Bot ---
echo [3/5] Iniciando Bot Elena Esmeraldas (puerto 5000)...
start "Elena Esmeraldas" /MIN cmd /c "cd /d C:\Users\Usuario\Desktop\Bot glass soler && python bot.py > bot_esmeraldas.log 2>&1"
timeout /t 3 /nobreak >nul

REM --- 4. Start CRM ---
echo [4/5] Iniciando CRM Next.js (puerto 3000)...
start "CRM Auto" /MIN cmd /c "cd /d C:\Users\Usuario\.claude\skills\auto-crm && npm run dev > crm.log 2>&1"
timeout /t 8 /nobreak >nul

REM --- 5. Start Cloudflare Tunnel ---
echo [5/5] Iniciando Cloudflare Tunnel publico...
start "Cloudflare Tunnel" cmd /c "cloudflared tunnel --url http://localhost:5001 > C:\Users\Usuario\Desktop\cf_tunnel.log 2>&1"
timeout /t 10 /nobreak >nul

REM --- Show status ---
echo.
echo ================================================================
echo                    ESTADO DE SERVICIOS
echo ================================================================
echo.

curl -s -o nul -w "CRM                  (3000): %%{http_code}\n" http://localhost:3000/
curl -s -o nul -w "Elena Esmeraldas     (5000): %%{http_code}\n" http://localhost:5000/
curl -s -o nul -w "Elena Glass Soler    (5001): %%{http_code}\n" http://localhost:5001/

echo.
echo Tunnel URL (espera unos segundos si no aparece):
findstr /R "trycloudflare.com" C:\Users\Usuario\Desktop\cf_tunnel.log 2>nul | findstr https

echo.
echo ================================================================
echo  URLs UTILES
echo ================================================================
echo   CRM:                http://localhost:3000
echo   Bot Glass Soler:    http://localhost:5001
echo   Bot Esmeraldas:     http://localhost:5000
echo   Tunnel log:         C:\Users\Usuario\Desktop\cf_tunnel.log
echo.
echo   Ctrl+C para detener este script (los servicios seguiran corriendo)
echo   Para detener todo: stop_ecosystem.bat
echo ================================================================
echo.

pause
