@echo off
:: =============================================================
:: CRM Soler - Registrar tareas con schtasks (sin admin requerido)
:: Las tareas se crean en \ (root) del usuario corriente
:: =============================================================

set SCRIPTS=C:\Users\Usuario\Documents\skills-soler\auto-crm\scripts\automation

echo ===========================================
echo  CRM SOLER - Instalando tareas programadas
echo ===========================================
echo.

:: 1) Auto Start al login
schtasks /Delete /TN "CRM Soler - Auto Start" /F >nul 2>&1
schtasks /Create /TN "CRM Soler - Auto Start" ^
  /TR "%SCRIPTS%\start-all.bat" ^
  /SC ONLOGON ^
  /RL LIMITED ^
  /F
if %errorlevel% equ 0 (echo [+] Auto Start registrada) else (echo [X] Auto Start FAIL)

:: 2) Daily Update 6am
schtasks /Delete /TN "CRM Soler - Daily Update" /F >nul 2>&1
schtasks /Create /TN "CRM Soler - Daily Update" ^
  /TR "%SCRIPTS%\daily-update.bat" ^
  /SC DAILY /ST 06:00 ^
  /RL LIMITED ^
  /F
if %errorlevel% equ 0 (echo [+] Daily Update 6am registrada) else (echo [X] Daily Update FAIL)

:: 3) Meta Sync 9am
schtasks /Delete /TN "CRM Soler - Meta Sync 9am" /F >nul 2>&1
schtasks /Create /TN "CRM Soler - Meta Sync 9am" ^
  /TR "%SCRIPTS%\sync-meta.bat" ^
  /SC DAILY /ST 09:00 ^
  /RL LIMITED ^
  /F
if %errorlevel% equ 0 (echo [+] Meta Sync 9am registrada) else (echo [X] Meta Sync 9am FAIL)

:: 4) Meta Sync 6pm
schtasks /Delete /TN "CRM Soler - Meta Sync 6pm" /F >nul 2>&1
schtasks /Create /TN "CRM Soler - Meta Sync 6pm" ^
  /TR "%SCRIPTS%\sync-meta.bat" ^
  /SC DAILY /ST 18:00 ^
  /RL LIMITED ^
  /F
if %errorlevel% equ 0 (echo [+] Meta Sync 6pm registrada) else (echo [X] Meta Sync 6pm FAIL)

:: 5) Health check cada 5 min
schtasks /Delete /TN "CRM Soler - Health Check" /F >nul 2>&1
schtasks /Create /TN "CRM Soler - Health Check" ^
  /TR "%SCRIPTS%\health-check.bat" ^
  /SC MINUTE /MO 5 ^
  /RL LIMITED ^
  /F
if %errorlevel% equ 0 (echo [+] Health Check cada 5min registrada) else (echo [X] Health Check FAIL)

echo.
echo ===========================================
echo  Tareas registradas:
echo ===========================================
schtasks /Query /FO TABLE /TN "CRM Soler - Auto Start" 2>nul
schtasks /Query /FO TABLE /TN "CRM Soler - Daily Update" 2>nul
schtasks /Query /FO TABLE /TN "CRM Soler - Meta Sync 9am" 2>nul
schtasks /Query /FO TABLE /TN "CRM Soler - Meta Sync 6pm" 2>nul
schtasks /Query /FO TABLE /TN "CRM Soler - Health Check" 2>nul

echo.
echo Para correr una manualmente:
echo   schtasks /Run /TN "CRM Soler - Daily Update"
echo.
echo Para ver logs:
echo   cd C:\Users\Usuario\Documents\skills-soler\auto-crm\logs

exit /b 0
