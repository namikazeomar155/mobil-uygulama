const http = require('http');
const os = require('os');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4040;
const QUEUE_DIR = path.join(__dirname, '..', '.agents', 'queue');
let currentTunnelUrl = '';

if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function runPowerShell(psCommand) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { maxBuffer: 10 * 1024 * 1024, timeout: 25000 }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        output: (stdout || '').trim(),
        error: err ? (stderr || err.message).trim() : '',
      });
    });
  });
}

// GitHub remote-config.json içine canlı tünel adresini otomatik kaydet
async function syncTunnelToGitHub(tunnelUrl) {
  try {
    const ps = `
      $cred = "protocol=https\`nhost=github.com\`n" | git credential fill
      $token = ($cred | Select-String "password=(.*)").Matches.Groups[1].Value
      $headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json" }
      $file = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json"
      $cfgPath = Join-Path "${path.join(__dirname, '..').replace(/\\/g, '\\\\')}" "remote-config.json"
      $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
      $cfg | Add-Member -NotePropertyName "bridgeUrl" -NotePropertyValue "${tunnelUrl}" -Force
      $cfg | Add-Member -NotePropertyName "lanUrl" -NotePropertyValue "http://192.168.178.59:4040" -Force
      $json = $cfg | ConvertTo-Json -Depth 4
      Set-Content -Path $cfgPath -Value $json -Encoding UTF8
      $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
      $body = @{ message = "chore: auto-sync live laptop bridge URL [skip ci]"; content = $b64; sha = $file.sha } | ConvertTo-Json
      Invoke-RestMethod -Method Put -Headers $headers -Uri "https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json" -Body $body | Out-Null
      "SYNC_OK"
    `;
    const res = await runPowerShell(ps);
    console.log('🔗 Tünel GitHub ile senkronize edildi:', tunnelUrl, res.output);
  } catch (e) {
    console.error('Tunnel sync error:', e.message);
  }
}

// Otomatik yenilenen SSH HTTPS Tüneli
function startAutoTunnel() {
  console.log('🌐 HTTPS Tüneli başlatılıyor...');
  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-R', `80:localhost:${PORT}`,
    'nokey@localhost.run'
  ]);

  const handleData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match && match[0] !== currentTunnelUrl) {
      currentTunnelUrl = match[0];
      console.log('✅ Yeni Canlı Tünel Adresi:', currentTunnelUrl);
      syncTunnelToGitHub(currentTunnelUrl);
    }
  };

  ssh.stdout.on('data', handleData);
  ssh.stderr.on('data', handleData);
  ssh.on('close', () => {
    console.log('🔄 Tünel kapandı, 3 saniye içinde yeniden bağlanılıyor...');
    setTimeout(startAutoTunnel, 3000);
  });
}

// CPU kullanımı hesaplama
let lastCpuInfo = os.cpus();
function getCpuUsagePercent() {
  const cpus = os.cpus();
  let idleDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < cpus.length; i++) {
    const type = cpus[i].times;
    const lastType = lastCpuInfo[i] ? lastCpuInfo[i].times : type;
    const total = Object.values(type).reduce((a, b) => a + b, 0);
    const lastTotal = Object.values(lastType).reduce((a, b) => a + b, 0);
    idleDiff += (type.idle - lastType.idle);
    totalDiff += (total - lastTotal);
  }
  lastCpuInfo = cpus;
  if (totalDiff === 0) return 14;
  return Math.max(1, Math.min(100, Math.round(100 - (100 * idleDiff / totalDiff))));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = req.url.split('?')[0];

  // 1. CANLI SİSTEM DURUMU (/status)
  if (req.method === 'GET' && url === '/status') {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsedGB = (usedMem / (1024 ** 3)).toFixed(1);
    const ramTotalGB = (totalMem / (1024 ** 3)).toFixed(1);
    const ramPercent = Math.round((usedMem / totalMem) * 100);
    const cpuPercent = getCpuUsagePercent();

    const batRes = await runPowerShell(
      `$b = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue; if ($b) { "$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)" } else { "100|2" }`
    );
    const [batPct, batStatus] = (batRes.output || '100|2').split('|');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      uptimeHours: (os.uptime() / 3600).toFixed(1),
      cpuPercent,
      ramUsedGB,
      ramTotalGB,
      ramPercent,
      batteryPercent: parseInt(batPct, 10) || 100,
      isCharging: batStatus !== '1',
      tunnelUrl: currentTunnelUrl,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
    }));
  }

  // 2. CANLI EKRAN GÖRÜNTÜSÜ (/screenshot)
  if (req.method === 'GET' && url === '/screenshot') {
    const psScreenshot = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)
      $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
      
      $targetW = 1280
      $targetH = [int]($screen.Height * (1280 / $screen.Width))
      $resized = New-Object System.Drawing.Bitmap($targetW, $targetH)
      $g2 = [System.Drawing.Graphics]::FromImage($resized)
      $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g2.DrawImage($bmp, 0, 0, $targetW, $targetH)

      $ms = New-Object System.IO.MemoryStream
      $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      $bytes = $ms.ToArray()
      $g2.Dispose()
      $resized.Dispose()
      $graphics.Dispose()
      $bmp.Dispose()
      $ms.Dispose()
      [Convert]::ToBase64String($bytes)
    `;
    const result = await runPowerShell(psScreenshot);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: result.ok && result.output.length > 100,
      image: result.output ? `data:image/jpeg;base64,${result.output}` : null,
      error: result.error,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
    }));
  }

  // 3. AÇIK UYGULAMALAR VE İŞLEMLER (/processes)
  if (req.method === 'GET' && url === '/processes') {
    const psProcs = `
      Get-Process | Where-Object { $_.WorkingSet64 -gt 25MB } |
      Sort-Object WorkingSet64 -Descending |
      Select-Object -First 20 Id, ProcessName, MainWindowTitle, @{N='MemoryMB';E={[math]::Round($_.WorkingSet64 / 1MB, 0)}} |
      ConvertTo-Json -Compress
    `;
    const result = await runPowerShell(psProcs);
    let list = [];
    try {
      list = JSON.parse(result.output || '[]');
      if (!Array.isArray(list)) list = [list];
    } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, processes: list }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch (e) {}

    // 4. HIZLI SİSTEM KONTROLLERİ (/action)
    if (req.method === 'POST' && url === '/action') {
      const { action, target } = payload;
      let ps = '';

      switch (action) {
        case 'volume_up':
          ps = `$obj = New-Object -ComObject WScript.Shell; 1..5 | ForEach-Object { $obj.SendKeys([char]175) }; "🔊 Ses artırıldı (+10%)"`;
          break;
        case 'volume_down':
          ps = `$obj = New-Object -ComObject WScript.Shell; 1..5 | ForEach-Object { $obj.SendKeys([char]174) }; "🔉 Ses kısıldı (-10%)"`;
          break;
        case 'volume_mute':
          ps = `$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173); "🔇 Ses durumu değiştirildi (Mute)"`;
          break;
        case 'media_play_pause':
          ps = `$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]179); "⏯️ Medya Oynat/Duraklat tetiklendi"`;
          break;
        case 'media_next':
          ps = `$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]176); "⏭️ Sonraki parçaya geçildi"`;
          break;
        case 'lock_pc':
          ps = `rundll32.exe user32.dll,LockWorkStation; "🔒 Laptop ekranı kilitlendi"`;
          break;
        case 'open_url':
          if (target) {
            const safeUrl = target.startsWith('http') ? target : `https://${target}`;
            ps = `Start-Process "${safeUrl}"; "🌐 ${safeUrl} laptopta açıldı"`;
          }
          break;
        case 'launch_app':
          if (target) {
            ps = `Start-Process "${target}"; "🚀 ${target} başlatıldı"`;
          }
          break;
        case 'kill_process':
          if (target) {
            ps = `Stop-Process -Id ${parseInt(target, 10)} -Force -ErrorAction Stop; "🛑 İşlem (${target}) kapatıldı"`;
          }
          break;
        case 'antigravity_task':
          if (target) {
            const taskFile = path.join(QUEUE_DIR, `task_${Date.now()}.json`);
            fs.writeFileSync(taskFile, JSON.stringify({
              prompt: target,
              createdAt: new Date().toISOString(),
              status: 'queued'
            }, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              ok: true,
              output: `✅ Görev Antigravity kuyruğuna iletildi: "${target}"`
            }));
          }
          break;
        default:
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Bilinmeyen aksiyon' }));
      }

      const result = await runPowerShell(ps);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // 5. DOĞRUDAN POWERSHELL / KOMUT ÇALIŞTIRMA (/exec)
    if (req.method === 'POST' && url === '/exec') {
      const { command } = payload;
      if (!command) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Komut boş olamaz' }));
      }
      const result = await runPowerShell(command);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Endpoint bulunamadı' }));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Nexus PC Bridge Server aktif: http://localhost:${PORT}`);
  startAutoTunnel();
});
