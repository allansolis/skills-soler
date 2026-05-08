@echo off
REM ═════════════════════════════════════════════════════════════
REM Post-Token-Renewal Trigger — corre todo lo que estaba bloqueado
REM Uso:
REM   1. Actualiza META_ACCESS_TOKEN, META_ADS_TOKEN, ZOLUTIUM_API_KEY en .env
REM   2. Ejecuta este script
REM ═════════════════════════════════════════════════════════════

cd /d "%~dp0\.."
echo.
echo ============================================
echo  POST-TOKEN RENEWAL — Sistema Elena Soler
echo ============================================
echo.

echo [1/4] Verificando token Meta...
python -c "import os, json, urllib.request, urllib.error; from pathlib import Path; env=Path('.env').read_text(encoding='utf-8'); tok=[l.split('=',1)[1].strip() for l in env.splitlines() if l.startswith('META_ADS_TOKEN=')][0]; r=urllib.request.urlopen(urllib.request.Request(f'https://graph.facebook.com/v25.0/me?access_token={tok}'), timeout=10); print('  Meta token OK:', json.loads(r.read()).get('name', json.loads(r.read())))" 2>nul
if errorlevel 1 (
    echo   ⚠️  Token Meta sigue invalido. Regenerar en Graph Explorer.
    goto skip_meta
)

echo.
echo [2/4] Aplicando fixes Glass Soler post-pago factura...
python scripts\auto-fix-glass.py
if errorlevel 1 echo   Error en auto-fix-glass

:skip_meta
echo.
echo [3/4] Verificando token Zolutium...
python -c "import os, json, urllib.request, urllib.error; from pathlib import Path; env=Path('.env').read_text(encoding='utf-8'); tok=[l.split('=',1)[1].strip() for l in env.splitlines() if l.startswith('ZOLUTIUM_API_KEY=')][0]; loc=[l.split('=',1)[1].strip() for l in env.splitlines() if l.startswith('ZOLUTIUM_LOCATION_ID=')][0]; req=urllib.request.Request(f'https://services.leadconnectorhq.com/locations/{loc}/customFields'); req.add_header('Authorization', f'Bearer {tok}'); req.add_header('Version','2021-07-28'); urllib.request.urlopen(req, timeout=10); print('  Zolutium token OK')" 2>nul
if errorlevel 1 (
    echo   ⚠️  Token Zolutium invalido. Regenerar en dashboard.
    goto skip_zolutium
)

echo.
echo [4/4] Extrayendo data Zolutium...
python scripts\extract-zolutium.py
if errorlevel 1 echo   Error en extract-zolutium

:skip_zolutium
echo.
echo ============================================
echo  TERMINADO. Revisa logs arriba.
echo ============================================
echo.
echo Backups locales: C:\Users\Usuario\Backups\skills-soler\
echo GitHub: https://github.com/allansolis/skills-soler
echo.
pause
