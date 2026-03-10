$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  node tools/qa/runtime-smoke.mjs
}
finally {
  Pop-Location
}
