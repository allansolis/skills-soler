@echo off
:: =============================================================
:: CRM Soler - Meta sync (corre 9am y 6pm)
:: Extrae datos frescos de Meta (posts, fotos, videos, conversaciones)
:: y los inserta en la DB del CRM.
:: =============================================================

set BOT_DIR=C:\Users\Usuario\Desktop\Bot glass soler
set LOG_DIR=C:\Users\Usuario\Documents\skills-soler\auto-crm\logs
set LOG_FILE=%LOG_DIR%\sync-meta.log

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo. >> "%LOG_FILE%"
echo [%date% %time%] === META SYNC START === >> "%LOG_FILE%"

cd /d "%BOT_DIR%"

:: Verificar que CRM este corriendo antes de syncear (para insertar en DB en uso)
curl -s -o nul -w "%%{http_code}" http://localhost:3000/ > "%TEMP%\crm_health.txt"
set /p HTTP=<"%TEMP%\crm_health.txt"
if not "%HTTP%"=="200" (
  echo [%date% %time%] CRM not running (HTTP %HTTP%), aborting sync >> "%LOG_FILE%"
  exit /b 1
)

:: Ejecutar extraccion
echo [%date% %time%] Running meta_full_extract.py >> "%LOG_FILE%"
python meta_full_extract.py >> "%LOG_FILE%" 2>&1

echo [%date% %time%] === META SYNC END === >> "%LOG_FILE%"

exit /b 0
