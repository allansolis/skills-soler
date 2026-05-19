@echo off
:: Auto-pausa ads con CTR<1% (corre 10am)
set BOT_DIR=C:\Users\Usuario\Desktop\Bot glass soler
cd /d "%BOT_DIR%"
python C:\Users\Usuario\Documents\skills-soler\auto-crm\scripts\automation\auto-pause-low-ctr.py
exit /b 0
