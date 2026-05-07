@echo off
REM Detiene todos los servicios del ecosistema Soler

echo Deteniendo servicios...
echo.

REM Puerto 3000 (CRM)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Matando CRM PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

REM Puerto 5000 (Bot Esmeraldas)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
  echo Matando Bot Esmeraldas PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

REM Puerto 5001 (Bot Glass Soler)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING') do (
  echo Matando Bot Glass Soler PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

REM Cloudflare tunnel
taskkill /IM cloudflared.exe /F >nul 2>&1

echo.
echo Servicios detenidos.
pause
