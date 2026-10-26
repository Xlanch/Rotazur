$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$syncScript = Join-Path $PSScriptRoot 'daily-sync.mjs'
$logFile = Join-Path $projectRoot 'data\sync.log'
$ErrorActionPreference = 'Continue'
& $nodeExecutable $syncScript *>> $logFile
exit $LASTEXITCODE
