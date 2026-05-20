# Push every key in .env.local to Vercel (production environment).
# Run from auto-crm/ root AFTER `vercel link` has set up .vercel/
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\vercel-env-push.ps1
#
# Idempotent: re-running overwrites existing values via `vercel env rm` first.

$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "$envFile not found in current directory. Run from auto-crm/ root."
    exit 1
}

if (-not (Test-Path ".vercel/project.json")) {
    Write-Error ".vercel/project.json not found. Run 'vercel link' first."
    exit 1
}

# Names to skip (these are LOCAL-only and should NOT be on Vercel)
$skip = @("BOT_DB_PATH")

$pushed = 0
$skipped = 0
$failed = 0

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if (-not ($line -match "^([A-Z][A-Z0-9_]*)=(.*)$")) { return }

    $name = $Matches[1]
    $value = $Matches[2]

    # Strip surrounding quotes if present
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if ($value.StartsWith("'") -and $value.EndsWith("'")) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    if ($skip -contains $name) {
        Write-Host "[skip]   $name (local-only)" -ForegroundColor Yellow
        $script:skipped += 1
        return
    }

    if (-not $value) {
        Write-Host "[skip]   $name (empty value)" -ForegroundColor Yellow
        $script:skipped += 1
        return
    }

    Write-Host "[push]   $name" -ForegroundColor Cyan
    # Remove existing first (ignore failure if not present)
    & vercel env rm $name production --yes 2>$null | Out-Null
    # Add new value via stdin pipe so special chars survive
    $value | & vercel env add $name production 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $script:pushed += 1
    } else {
        Write-Host "[FAIL]   $name (exit $LASTEXITCODE)" -ForegroundColor Red
        $script:failed += 1
    }
}

Write-Host ""
Write-Host "===== SUMMARY ====="
Write-Host "Pushed:  $pushed"
Write-Host "Skipped: $skipped"
Write-Host "Failed:  $failed"
