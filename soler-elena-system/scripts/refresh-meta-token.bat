@echo off
REM Helper para refrescar Meta Ads token rapido
REM Uso: pega el token en la siguiente linea y ejecuta el .bat
REM
REM COMO OBTENER EL TOKEN:
REM 1. Abrir https://developers.facebook.com/tools/explorer/
REM 2. Seleccionar app "Soler Inversiones"
REM 3. Click "Generate Access Token"
REM 4. Copiar el token largo que empieza con EAANgIci0zHsBR...
REM 5. Pegarlo dentro de las comillas abajo
REM 6. Ejecutar este .bat (doble click)

set "NEW_TOKEN=PEGA_EL_TOKEN_AQUI"

if "%NEW_TOKEN%"=="PEGA_EL_TOKEN_AQUI" (
  echo ERROR: Edita este archivo y pega el token en la variable NEW_TOKEN
  echo Abre: https://developers.facebook.com/tools/explorer/
  pause
  exit /b 1
)

REM Actualiza ambos archivos .env
powershell -NoProfile -Command "(Get-Content 'C:\Users\Usuario\Desktop\Bot glass soler\.env' -Raw) -replace 'META_ADS_TOKEN=.*', 'META_ADS_TOKEN=%NEW_TOKEN%' | Set-Content 'C:\Users\Usuario\Desktop\Bot glass soler\.env' -NoNewline"
powershell -NoProfile -Command "(Get-Content 'C:\Users\Usuario\.claude\skills\auto-crm\.env.local' -Raw) -replace 'META_ADS_TOKEN=.*', 'META_ADS_TOKEN=%NEW_TOKEN%' | Set-Content 'C:\Users\Usuario\.claude\skills\auto-crm\.env.local' -NoNewline"

echo Token actualizado en:
echo   - C:\Users\Usuario\Desktop\Bot glass soler\.env
echo   - C:\Users\Usuario\.claude\skills\auto-crm\.env.local
echo.
echo Reiniciando CRM...

REM Matar CRM en puerto 3000 + reiniciar
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2^>nul
timeout /t 3 /nobreak >nul
start "CRM" /MIN cmd /c "cd /d C:\Users\Usuario\.claude\skills\auto-crm && npm run dev"

echo.
echo Listo. Espera 10s y abre http://localhost:3000/ads
timeout /t 10 /nobreak >nul
start http://localhost:3000/ads
