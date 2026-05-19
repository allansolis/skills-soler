@echo off
schtasks /Delete /TN "CRM Soler - Auto Pause Bad Ads" /F 2>nul
schtasks /Create /TN "CRM Soler - Auto Pause Bad Ads" ^
  /TR "C:\Users\Usuario\Documents\skills-soler\auto-crm\scripts\automation\auto-pause-low-ctr.bat" ^
  /SC DAILY /ST 10:00 ^
  /RL LIMITED ^
  /F
exit /b 0
