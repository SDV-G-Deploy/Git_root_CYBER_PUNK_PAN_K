param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [string]$OutputPath = 'qa/telemetry-difficulty-report.json'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  node tools/qa/analyze-telemetry.mjs --input $InputPath --output $OutputPath
}
finally {
  Pop-Location
}
