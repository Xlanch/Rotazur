$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = 'RotaPlanlayicisi_GunlukFiyatGuncelleme'
if ((Get-TimeZone).Id -ne 'Turkey Standard Time') { throw 'Task schedule requires the Europe/Istanbul Windows time zone.' }
# Windows' built-in hidden command host and the existing Node installation.
# No execution-policy changes or dependency on the coding application's runtime.
if (!(Test-Path -LiteralPath (Join-Path $env:ProgramFiles 'nodejs\node.exe'))) { throw 'Existing Node.js installation was not found.' }
$hostExecutable = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$runner = Join-Path $PSScriptRoot 'scheduled-sync.cjs'
$nodeExecutable = Join-Path $env:ProgramFiles 'nodejs\node.exe'
$invocation = "& '" + $nodeExecutable.Replace("'", "''") + "' '" + $runner.Replace("'", "''") + "'; exit `$LASTEXITCODE"
$action = New-ScheduledTaskAction -Execute $hostExecutable -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -Command "' + $invocation + '"') -WorkingDirectory $projectRoot
$triggers = @((New-ScheduledTaskTrigger -Daily -At '00:00'), (New-ScheduledTaskTrigger -Daily -At '12:00'))
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) { $settings = $existing.Settings } else { $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries }
$settings.Hidden = $true
$settings.StartWhenAvailable = $true
$settings.MultipleInstances = 'IgnoreNew'
$settings.ExecutionTimeLimit = 'PT40M'
if ($existing) { Set-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings | Out-Null }
else { Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Description 'Free Aviasales indicative flight data, weather and currency refresh. No hotel queries or email.' | Out-Null }
Write-Output 'Installed: 00:00 and 12:00 Europe/Istanbul. Computer must be on.'
