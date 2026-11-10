# Packages the extension into dist/studylock-<version>.zip for the Edge, Firefox and Chrome stores.
# Uses forward slashes inside the zip (Firefox rejects zips made by PowerShell 5's Compress-Archive).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Join-Path $PSScriptRoot 'studylock'
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$dist = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$zipPath = Join-Path $dist "studylock-$($manifest.version).zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  Get-ChildItem $root -Recurse -File | ForEach-Object {
    $entry = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal') | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Host "Created $zipPath"
