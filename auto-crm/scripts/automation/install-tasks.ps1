# =============================================================
# CRM Soler - Registrar tareas en Windows Task Scheduler
# Correr como Administrador (boton derecho > Run as administrator)
# =============================================================

$ErrorActionPreference = "Stop"
$User = $env:USERNAME
$ScriptsDir = "C:\Users\Usuario\Documents\skills-soler\auto-crm\scripts\automation"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host " CRM SOLER - Instalando tareas programadas" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================
# Funcion helper para registrar tarea
# =============================================================
function Register-CrmTask {
    param(
        [string]$Name,
        [string]$Description,
        [string]$ScriptPath,
        [object]$Trigger
    )

    # Eliminar tarea anterior si existe
    if (Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $Name -Confirm:$false
        Write-Host "  [-] Tarea existente '$Name' eliminada" -ForegroundColor Yellow
    }

    $Action = New-ScheduledTaskAction -Execute $ScriptPath
    $Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Highest
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    Register-ScheduledTask -TaskName $Name `
        -Description $Description `
        -Action $Action `
        -Trigger $Trigger `
        -Principal $Principal `
        -Settings $Settings | Out-Null

    Write-Host "  [+] $Name registrada" -ForegroundColor Green
}

# =============================================================
# 1) Auto-start al login (CRM + Tunnel)
# =============================================================
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $User
Register-CrmTask -Name "CRM Soler - Auto Start" `
    -Description "Arranca CRM + Tunnel al loguearse el usuario" `
    -ScriptPath "$ScriptsDir\start-all.bat" `
    -Trigger $TriggerLogon

# =============================================================
# 2) Daily update (6am)
# =============================================================
$TriggerDaily = New-ScheduledTaskTrigger -Daily -At "6:00am"
Register-CrmTask -Name "CRM Soler - Daily Update" `
    -Description "git pull + npm install + restart cada manana 6am" `
    -ScriptPath "$ScriptsDir\daily-update.bat" `
    -Trigger $TriggerDaily

# =============================================================
# 3) Meta sync 2x/dia (9am + 6pm)
# =============================================================
$TriggerSync9am = New-ScheduledTaskTrigger -Daily -At "9:00am"
$TriggerSync6pm = New-ScheduledTaskTrigger -Daily -At "6:00pm"
Register-CrmTask -Name "CRM Soler - Meta Sync 9am" `
    -Description "Extrae datos Meta a la DB del CRM (manana)" `
    -ScriptPath "$ScriptsDir\sync-meta.bat" `
    -Trigger $TriggerSync9am

Register-CrmTask -Name "CRM Soler - Meta Sync 6pm" `
    -Description "Extrae datos Meta a la DB del CRM (tarde)" `
    -ScriptPath "$ScriptsDir\sync-meta.bat" `
    -Trigger $TriggerSync6pm

# =============================================================
# 4) Health check cada 5 min (auto-restart si cae)
# =============================================================
$TriggerHealth = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration (New-TimeSpan -Days 365)

Register-CrmTask -Name "CRM Soler - Health Check" `
    -Description "Verifica CRM + tunnel cada 5 min, restart si cayeron" `
    -ScriptPath "$ScriptsDir\health-check.bat" `
    -Trigger $TriggerHealth

# =============================================================
# Resumen
# =============================================================
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host " Tareas instaladas:" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Get-ScheduledTask -TaskName "CRM Soler -*" | ForEach-Object {
    $next = (Get-ScheduledTaskInfo $_.TaskName).NextRunTime
    Write-Host ("  {0,-30s} next run: {1}" -f $_.TaskName, $next) -ForegroundColor White
}

Write-Host ""
Write-Host "Para correr una manualmente:" -ForegroundColor Gray
Write-Host '  Start-ScheduledTask -TaskName "CRM Soler - Daily Update"' -ForegroundColor Gray
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Gray
Write-Host "  cd C:\Users\Usuario\Documents\skills-soler\auto-crm\logs" -ForegroundColor Gray
