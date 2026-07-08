#Requires -Version 5.1
<#
.SYNOPSIS
  Sincroniza patio-bohemio-app hacia mango-app (robocopy + npm install).

.DESCRIPTION
  Copia el codigo fuente desde el proyecto origen al destino, preservando
  configuracion local (.env), dependencias, builds, logs y uploads del destino.
  No modifica el proyecto origen.

.EXAMPLE
  .\scripts\sync-mango-app.ps1

.EXAMPLE
  .\scripts\sync-mango-app.ps1 -Origen "D:\Productos_web\patio-bohemio-app" -Destino "D:\Productos_web\mango-app"
#>
[CmdletBinding()]
param(
    [Parameter()]
    [string] $Origen = "D:\Productos_web\patio-bohemio-app",

    [Parameter()]
    [string] $Destino = "D:\Productos_web\mango-app"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string] $Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-RobocopySuccess {
    param([int] $ExitCode)
    # 0 = sin cambios, 1 = archivos copiados, 2+ = extras (avisos); >= 8 = error
    return ($ExitCode -lt 8)
}

$Origen = (Resolve-Path -LiteralPath $Origen).Path
if (-not (Test-Path -LiteralPath $Destino)) {
    throw "La carpeta destino no existe: $Destino"
}
$Destino = (Resolve-Path -LiteralPath $Destino).Path

if ($Origen.TrimEnd('\') -eq $Destino.TrimEnd('\')) {
    throw "Origen y destino no pueden ser la misma carpeta."
}

Write-Step "Sincronizando codigo"
Write-Host "  Origen : $Origen"
Write-Host "  Destino: $Destino"

$robocopyArgs = @(
    $Origen,
    $Destino,
    "/MIR",
    "/E",
    "/XD", "node_modules", "frontend\node_modules", "dist", "frontend\dist",
           "logs", "logs_audit", "uploads", ".git", ".vscode", ".copilot",
    "/XF", ".env", "frontend\.env.local", "frontend\.env.development", "frontend\.env.production", "*.pem",
    "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS"
)

& robocopy @robocopyArgs
$robocopyExit = $LASTEXITCODE

if (-not (Test-RobocopySuccess -ExitCode $robocopyExit)) {
    throw "Robocopy fallo con codigo de salida $robocopyExit."
}

Write-Host "Robocopy completado (codigo $robocopyExit)." -ForegroundColor Green

Write-Step "Instalando dependencias en destino"
Push-Location -LiteralPath $Destino
try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install fallo con codigo de salida $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Listo. mango-app actualizado." -ForegroundColor Green
