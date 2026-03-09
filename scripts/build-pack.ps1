$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  node tools/qa/build-pack.mjs @args
}
finally {
  Pop-Location
}
