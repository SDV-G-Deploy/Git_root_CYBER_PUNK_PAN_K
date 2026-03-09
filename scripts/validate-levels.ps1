$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  node tools/qa/validate-levels.mjs
}
finally {
  Pop-Location
}
