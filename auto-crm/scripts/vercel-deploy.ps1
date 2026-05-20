# End-to-end Vercel deploy helper for auto-crm.
# Walks through: login -> link -> env push -> deploy.
#
# Pre-requisites:
#   - npm i -g vercel        (already installed)
#   - .env.local fully populated, including TURSO_DATABASE_URL/TOKEN
#   - npx drizzle-kit push (against Turso) already ran successfully
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\vercel-deploy.ps1

$ErrorActionPreference = "Stop"

# Sanity: must be in auto-crm root
if (-not (Test-Path "package.json") -or -not (Test-Path "next.config.ts")) {
    Write-Error "Run this script from the auto-crm/ project root."
    exit 1
}

# Sanity: .env.local must exist and have TURSO vars
if (-not (Test-Path ".env.local")) {
    Write-Error ".env.local missing."
    exit 1
}
$envText = Get-Content ".env.local" -Raw
if ($envText -notmatch "TURSO_DATABASE_URL=libsql://") {
    Write-Error "TURSO_DATABASE_URL not found in .env.local. Set it before deploying."
    exit 1
}
if ($envText -notmatch "TURSO_AUTH_TOKEN=") {
    Write-Error "TURSO_AUTH_TOKEN not found in .env.local. Set it before deploying."
    exit 1
}

# --- Step 1: login (interactive, opens browser) ---
Write-Host "===== Step 1/4: vercel login =====" -ForegroundColor Cyan
& vercel whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    & vercel login
    if ($LASTEXITCODE -ne 0) { Write-Error "vercel login failed."; exit 1 }
} else {
    Write-Host "already logged in." -ForegroundColor Green
}

# --- Step 2: link project ---
Write-Host ""
Write-Host "===== Step 2/4: vercel link =====" -ForegroundColor Cyan
if (Test-Path ".vercel/project.json") {
    Write-Host ".vercel/project.json exists — project already linked." -ForegroundColor Green
} else {
    & vercel link --yes
    if ($LASTEXITCODE -ne 0) { Write-Error "vercel link failed."; exit 1 }
}

# --- Step 3: push env vars ---
Write-Host ""
Write-Host "===== Step 3/4: push env vars =====" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File scripts\vercel-env-push.ps1

# --- Step 4: deploy to production ---
Write-Host ""
Write-Host "===== Step 4/4: vercel deploy --prod =====" -ForegroundColor Cyan
& vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { Write-Error "vercel deploy failed."; exit 1 }

Write-Host ""
Write-Host "===== DEPLOY DONE =====" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1) Copy the production URL printed above"
Write-Host "  2) Go to developers.facebook.com -> your apps -> Webhook settings"
Write-Host "  3) Replace the trycloudflare URL with: https://<your-vercel-app>/api/meta/webhook"
Write-Host "  4) Use META_VERIFY_TOKEN value from .env.local when prompted"
Write-Host "  5) Re-subscribe each Page to the webhook (Messenger + Instagram + WhatsApp)"
