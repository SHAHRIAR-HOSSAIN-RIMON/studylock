# Packages the extension for the stores:
#   dist/studylock-<version>-chromium.zip  -> Microsoft Edge Add-ons and Chrome Web Store
#   dist/studylock-<version>-firefox.zip   -> Firefox Add-ons
# Each zip gets a manifest with only the keys that browser understands, so the stores show no warnings.
# Uses forward slashes inside the zip (Firefox rejects zips made by PowerShell 5's Compress-Archive).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Join-Path $PSScriptRoot 'studylock'
$manifestText = Get-Content (Join-Path $root 'manifest.json') -Raw -Encoding UTF8
$version = ($manifestText | ConvertFrom-Json).version
$dist = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

function New-Manifest([string]$target) {
  $m = $manifestText | ConvertFrom-Json
  if ($target -eq 'chromium') {
    # Edge/Chrome: service worker only; drop Firefox-only keys.
    $m.background.PSObject.Properties.Remove('scripts')
    $m.PSObject.Properties.Remove('browser_specific_settings')
  } else {
    # Firefox: event page scripts only; drop Chrome-only keys.
    $m.background.PSObject.Properties.Remove('service_worker')
    $m.PSObject.Properties.Remove('minimum_chrome_version')
  }
  return ($m | ConvertTo-Json -Depth 20)
}

foreach ($target in 'chromium', 'firefox') {
  $zipPath = Join-Path $dist "studylock-$version-$target.zip"
  if (Test-Path $zipPath) { Remove-Item $zipPath }
  $zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
  try {
    Get-ChildItem $root -Recurse -File | ForEach-Object {
      $entryName = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
      if ($entryName -eq 'manifest.json') {
        $entry = $zip.CreateEntry('manifest.json', 'Optimal')
        $writer = New-Object System.IO.StreamWriter($entry.Open(), (New-Object System.Text.UTF8Encoding($false)))
        $writer.Write((New-Manifest $target))
        $writer.Dispose()
      } else {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, 'Optimal') | Out-Null
      }
    }
  } finally {
    $zip.Dispose()
  }
  Write-Host "Created $zipPath"
}
