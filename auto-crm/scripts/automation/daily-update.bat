@echo off
:: =============================================================
:: CRM Soler - Daily update (6am)
:: 1. git pull (skills-soler + CRM-Soler)
:: 2. npm install si package.json cambio
:: 3. Recompila si codigo cambio
:: 4. Restart CRM
:: =============================================================

set CRM_DIR=C:\Users\Usuario\Documents\skills-soler\auto-crm
set REPO_DIR=C:\Users\Usuario\Documents\skills-soler
set CRM_SOLER_DIR=C:\Users\Usuario\Documents\CRM-Soler
set LOG_DIR=%CRM_DIR%\logs
set LOG_FILE=%LOG_DIR%\daily-update.log

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo. >> "%LOG_FILE%"
echo [%date% %time%] === DAILY UPDATE START === >> "%LOG_FILE%"

:: 1. Git pull skills-soler
cd /d "%REPO_DIR%"
echo [%date% %time%] git pull skills-soler... >> "%LOG_FILE%"
git pull origin master >> "%LOG_FILE%" 2>&1

:: 2. Git pull CRM-Soler
if exist "%CRM_SOLER_DIR%\.git" (
  cd /d "%CRM_SOLER_DIR%"
  echo [%date% %time%] git pull CRM-Soler... >> "%LOG_FILE%"
  git pull origin master >> "%LOG_FILE%" 2>&1
)

:: 3. npm install si hay cambios en package.json
cd /d "%CRM_DIR%"
git diff HEAD@{1} HEAD -- package.json 2>nul | findstr /R /C:"^[+-]" >nul
if %errorlevel% equ 0 (
  echo [%date% %time%] package.json changed, running npm install >> "%LOG_FILE%"
  call npm install >> "%LOG_FILE%" 2>&1
)

:: 4. Restart CRM (kill + restart via start-all)
echo [%date% %time%] Restarting CRM >> "%LOG_FILE%"
call "%CRM_DIR%\scripts\automation\start-all.bat"

echo [%date% %time%] === DAILY UPDATE END === >> "%LOG_FILE%"

exit /b 0
