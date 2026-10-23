param([switch]$ShowPopup)

$bridgeDir = "C:\Users\omar\.gemini\antigravity\scratch\mobil-uygulama\pc-bridge"
$projectDir = "C:\Users\omar\.gemini\antigravity\scratch\mobil-uygulama"
$logFile = Join-Path $bridgeDir "bridge.log"

# Port 4040 uzerinde calisan eski bir kopya varsa temizle
$existing = Get-NetTCPConnection -LocalPort 4040 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  foreach ($conn in $existing) {
    if ($conn.OwningProcess -gt 4) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 1
}
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue

Set-Content -Path $logFile -Value "" -Encoding UTF8

# Windows arka plan sureci olarak baslat
$nodeExe = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodeExe)) { $nodeExe = "node.exe" }
Start-Process -FilePath $nodeExe -ArgumentList "`"$bridgeDir\server.js`"" -WorkingDirectory $bridgeDir -WindowStyle Hidden

if ($ShowPopup) {
  Start-Sleep -Seconds 4
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    "Namikaze AI Laptop Koprusu arka planda basariyla baslatildi!`n`n• Port: 4040 (Aktif)`n• Cloudflare & SSH Tuneli: Otomatik Senkronize`n• Antigravity Usage Tuketimi: %0 (Tamamen Bagimsiz)",
    "Namikaze AI",
    "OK",
    "Information"
  ) | Out-Null
}
