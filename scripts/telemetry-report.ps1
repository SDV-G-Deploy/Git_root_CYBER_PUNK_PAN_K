param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [string]$OutputPath
)

if (-not (Test-Path $InputPath)) {
  throw "Input file not found: $InputPath"
}

$raw = Get-Content -Raw $InputPath
if ([string]::IsNullOrWhiteSpace($raw)) {
  throw "Telemetry file is empty: $InputPath"
}

$records = @()
try {
  $parsed = $raw | ConvertFrom-Json
  if ($parsed -is [System.Array]) {
    $records = $parsed
  } elseif ($null -ne $parsed) {
    $records = @($parsed)
  }
} catch {
  $lines = $raw -split "`n"
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0) {
      continue
    }

    try {
      $records += ($trimmed | ConvertFrom-Json)
    } catch {
      # Skip malformed JSONL line in MVP script.
    }
  }
}

if ($records.Count -eq 0) {
  throw "No telemetry records parsed from: $InputPath"
}

$runs = @{}
$levelStats = @{}
$retryCount = 0

foreach ($entry in $records) {
  $runId = if ($entry.runId) { [string]$entry.runId } else { "unknown" }
  if (-not $runs.ContainsKey($runId)) {
    $runs[$runId] = [ordered]@{
      startAt = $null
      endAt = $null
      levelId = $null
      result = $null
    }
  }

  $run = $runs[$runId]
  $eventType = [string]$entry.eventType
  $payload = $entry.payload

  if ($eventType -eq 'run_start') {
    $run.startAt = [double]$entry.timestamp
    if ($payload.levelId) { $run.levelId = [string]$payload.levelId }
  }

  if ($eventType -eq 'run_end') {
    $run.endAt = [double]$entry.timestamp
    if ($payload.levelId) { $run.levelId = [string]$payload.levelId }
    if ($payload.result) { $run.result = [string]$payload.result }

    if ($run.levelId) {
      if (-not $levelStats.ContainsKey($run.levelId)) {
        $levelStats[$run.levelId] = [ordered]@{ attempts = 0; wins = 0; fails = 0 }
      }

      $stats = $levelStats[$run.levelId]
      $stats.attempts += 1
      if ($run.result -eq 'win') {
        $stats.wins += 1
      } else {
        $stats.fails += 1
      }
    }
  }

  if ($eventType -eq 'retry') {
    $retryCount += 1
  }
}

$runList = @($runs.Values)
$completedRuns = @($runList | Where-Object { $_.startAt -ne $null -and $_.endAt -ne $null })

$totalDurationSec = 0.0
foreach ($run in $completedRuns) {
  $totalDurationSec += [Math]::Max(0, ($run.endAt - $run.startAt) / 1000.0)
}

$avgSessionSec = if ($completedRuns.Count -gt 0) { $totalDurationSec / $completedRuns.Count } else { 0.0 }
$retryRate = if ($runList.Count -gt 0) { $retryCount / $runList.Count } else { 0.0 }

$levelIds = @('L01','L02','L03','L04','L05','L06','L07','L08','L09','L10','L11','L12')
$funnelLines = @()
foreach ($id in $levelIds) {
  if (-not $levelStats.ContainsKey($id)) {
    $funnelLines += "- ${id}: attempts=0, wins=0, completion=0.0%"
    continue
  }

  $stats = $levelStats[$id]
  $completion = if ($stats.attempts -gt 0) { ($stats.wins / $stats.attempts) * 100.0 } else { 0.0 }
  $funnelLines += "- ${id}: attempts=$($stats.attempts), wins=$($stats.wins), completion=$([Math]::Round($completion,1))%"
}

$failRanking = @()
foreach ($entry in $levelStats.GetEnumerator()) {
  if ($entry.Value.fails -gt 0) {
    $failRanking += [PSCustomObject]@{
      Level = $entry.Key
      Fails = $entry.Value.fails
      Attempts = $entry.Value.attempts
    }
  }
}
$failRanking = $failRanking | Sort-Object -Property @{Expression='Fails';Descending=$true}, @{Expression='Level';Descending=$false}
$topFails = @($failRanking | Select-Object -First 5)

$lines = @()
$lines += 'Telemetry Report (v0.1-playtest)'
$lines += ''
$lines += "Runs observed: $($runList.Count)"
$lines += "Avg session length: $([Math]::Round($avgSessionSec,2))s"
$lines += "Retry rate: $([Math]::Round($retryRate*100.0,1))% ($retryCount retries)"
$lines += ''
$lines += 'Level completion funnel (L1-L12):'
$lines += $funnelLines
$lines += ''
$lines += 'Top fail levels:'
if ($topFails.Count -eq 0) {
  $lines += '- no fails captured'
} else {
  foreach ($fail in $topFails) {
    $lines += "- $($fail.Level): fails=$($fail.Fails)/$($fail.Attempts)"
  }
}
$lines += ''
$lines += 'Known issues:'
$lines += '- Screen shake can feel strong on dense chains.'
$lines += '- Telemetry is local-only and resets if storage is cleared.'
$lines += '- Funnel quality improves after enough external sessions.'

$report = $lines -join "`n"
if ($OutputPath) {
  Set-Content -Path $OutputPath -Value $report -NoNewline
  Write-Output "Report written to: $OutputPath"
} else {
  Write-Output $report
}