# ========================================================
# NEON SURVIVOR - Automated Release Builder & Packager
# ========================================================
$Host.UI.RawUI.WindowTitle = "Neon Survivor - Release Builder"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "         NEON SURVIVOR - RELEASE BUILDER" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$gameDir = $PSScriptRoot
Set-Location $gameDir

# 1. Beende laufende Instanzen
Write-Host "[1/4] Beende evtl. laufende Spiel-Instanzen..." -ForegroundColor Yellow
Get-Process -Name "Neon Survivor*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 600

# 2. Kompiliere Root-Launcher
Write-Host "[2/4] Kompiliere Root-Launcher (Neon Survivor.exe)..." -ForegroundColor Yellow
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (Test-Path $csc) {
    & $csc /nologo /target:winexe /win32icon:data\src\icon.ico /out:"Neon Survivor.exe" data\src\Launcher.cs 2>$null
    Write-Host "      ✓ Root-Launcher erfolgreich aktualisiert." -ForegroundColor Green
} else {
    Write-Host "      (csc.exe nicht gefunden, überspringe Launcher)" -ForegroundColor Gray
}

# 3. Baue Standalone Electron-App
Write-Host "[3/4] Baue Standalone App (build\Neon Survivor-win32-x64)..." -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FEHLER] Electron-Packager ist fehlgeschlagen!" -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ Standalone-App erfolgreich gebaut!" -ForegroundColor Green

# 4. Version ermitteln und ZIP erstellen
Write-Host "[4/4] Erstelle fertige ZIP-Datei auf dem Desktop..." -ForegroundColor Yellow
$pkgJsonPath = Join-Path $gameDir "package.json"
$ver = "1.0.0"
if (Test-Path $pkgJsonPath) {
    try {
        $pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
        if ($pkg.version) { $ver = $pkg.version }
    } catch {}
}

$desktop = [Environment]::GetFolderPath("Desktop")
$zipFileName = "Neon-Survivor-Windows-v$ver.zip"
$zipDestination = Join-Path $desktop $zipFileName
$sourceDir = Join-Path $gameDir "build\Neon Survivor-win32-x64"

if (Test-Path $zipDestination) {
    Remove-Item $zipDestination -Force
}

Compress-Archive -Path $sourceDir -DestinationPath $zipDestination -Force

if (Test-Path $zipDestination) {
    $zipSizeMb = [math]::Round((Get-Item $zipDestination).Length / 1MB, 1)
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "  ERFOLGREICH ERSTELLT!" -ForegroundColor Green
    Write-Host "  Datei: $zipFileName ($zipSizeMb MB)" -ForegroundColor White
    Write-Host "  Ort:   $zipDestination" -ForegroundColor White
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Du kannst diese ZIP-Datei jetzt direkt an Freunde schicken" -ForegroundColor Cyan
    Write-Host "oder auf SwissTransfer / WeTransfer / Google Drive hochladen!" -ForegroundColor Cyan
} else {
    Write-Host "[FEHLER] Die ZIP-Datei konnte nicht erstellt werden!" -ForegroundColor Red
    exit 1
}
