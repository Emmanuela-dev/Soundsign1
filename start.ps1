# ─────────────────────────────────────────────────────────────────────────────
# start.ps1  —  SoundSigns dev launcher
#
# Starts both the Flask backend (port 5000) and the Vite frontend (port 3000)
# with a single command.  Run from the project root:
#
#   .\start.ps1
#
# The backend opens in its own PowerShell window so its logs stay separate.
# The frontend runs in the current terminal.
# Closing either window does NOT kill the other — stop them independently.
# ─────────────────────────────────────────────────────────────────────────────

$root     = $PSScriptRoot
$backend  = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "  SoundSigns Dev Launcher" -ForegroundColor Cyan
Write-Host "  ────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── 1. Check Python ───────────────────────────────────────────────────────────
$pyCmd = $null
foreach ($candidate in @("py", "python3", "python")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $pyCmd = $candidate
        break
    }
}

if (-not $pyCmd) {
    Write-Host "  [ERROR] Python not found. Install Python 3.8+ and add it to PATH." -ForegroundColor Red
    exit 1
}

# ── 2. Check .env has a real key ──────────────────────────────────────────────
$envFile = Join-Path $backend ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "your_openai_api_key_here|your_gemini_api_key_here|your_.*_key_here") {
        Write-Host "  [WARN] backend\.env contains a placeholder key." -ForegroundColor Yellow
        Write-Host "         ISL gloss text will use rule-based fallback (signs still play)." -ForegroundColor DarkYellow
        Write-Host ""
    }
} else {
    Write-Host "  [WARN] backend\.env not found. Creating a template..." -ForegroundColor Yellow
    Set-Content $envFile "GEMINI_API_KEY=your_gemini_api_key_here"
    Write-Host ""
}

# ── 3. Start backend in a new PowerShell window ───────────────────────────────
Write-Host "  Starting backend  →  http://localhost:5000" -ForegroundColor Green
$backendCmd = "$pyCmd `"$backend\transcription.py`""
Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "Write-Host '  [BACKEND] Flask starting on port 5000...' -ForegroundColor Cyan; Set-Location '$backend'; $backendCmd" `
    -WindowStyle Normal

# Give Flask a moment to bind its port
Start-Sleep -Milliseconds 1500

# ── 4. Verify backend responded ───────────────────────────────────────────────
$backendOk = $false
for ($i = 1; $i -le 8; $i++) {
    try {
        $r = Invoke-RestMethod "http://localhost:5000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($r.status -eq "healthy") { $backendOk = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 800
}

if ($backendOk) {
    Write-Host "  Backend is healthy ✓" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Backend did not respond in time. It may still be starting." -ForegroundColor Yellow
    Write-Host "         Check the backend window for errors." -ForegroundColor DarkYellow
}

Write-Host ""

# ── 5. Start frontend in current terminal ─────────────────────────────────────
Write-Host "  Starting frontend →  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop the frontend." -ForegroundColor DarkGray
Write-Host "  Close the backend window separately to stop Flask." -ForegroundColor DarkGray
Write-Host ""

Set-Location $frontend
npm run dev
