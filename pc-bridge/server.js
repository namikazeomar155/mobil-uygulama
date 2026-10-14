const http = require('http');
const os = require('os');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4040;
const QUEUE_DIR = path.join(__dirname, '..', '.agents', 'queue');
const CLOUDFLARED_BIN = path.join(__dirname, 'cloudflared.exe');
const LOG_FILE = path.join(__dirname, 'bridge.log');

function logMsg(...args) {
  const line = `[${new Date().toLocaleTimeString('tr-TR')}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line, 'utf8'); } catch (e) {}
  console.log(...args);
}

let primaryTunnelUrl = '';
let backupTunnelUrl = '';

if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        return net.address;
      }
    }
  }
  return '192.168.178.59';
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

let isSyncing = false;
let pendingSync = false;
async function syncTunnelToGitHub() {
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  const bestUrl = primaryTunnelUrl || backupTunnelUrl;
  if (!bestUrl) return;
  isSyncing = true;
  pendingSync = false;
  try {
    const lanUrl = `http://${getLocalLanIp()}:${PORT}`;
    const cfgPath = path.join(__dirname, '..', 'remote-config.json');
    let currentCfg = { version: '3.2.0', announcement: '' };
    if (fs.existsSync(cfgPath)) {
      try {
        currentCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      } catch (e) {}
    }
    currentCfg.version = currentCfg.version || '3.2.0';
    currentCfg.bridgeUrl = bestUrl;
    currentCfg.backupTunnelUrl = backupTunnelUrl || bestUrl;
    currentCfg.lanUrl = lanUrl;
    currentCfg.updatedAt = new Date().toISOString();

    const jsonStr = JSON.stringify(currentCfg, null, 2);
    fs.writeFileSync(cfgPath, jsonStr, 'utf8');

    const b64Content = Buffer.from(jsonStr, 'utf8').toString('base64');
    const ps = `
      $cred = "protocol=https\`nhost=github.com\`n" | git credential fill
      $token = ($cred | Select-String "password=(.*)").Matches.Groups[1].Value
      $headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json" }
      $file = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json"
      $body = @{ message = "chore: auto-sync live laptop bridge URL [skip ci]"; content = "${b64Content}"; sha = $file.sha } | ConvertTo-Json
      Invoke-RestMethod -Method Put -Headers $headers -Uri "https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json" -Body $body | Out-Null
      "SYNC_OK"
    `;
    const res = await runPowerShell(ps);
    logMsg('🔗 Tünel GitHub ile senkronize edildi:', { bestUrl, backupTunnelUrl, lanUrl }, res.output);
  } catch (e) {
    logMsg('Tunnel sync error:', e.message);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      setTimeout(syncTunnelToGitHub, 1500);
    }
  }
}

// 1. Birincil Kararlı Tünel: Cloudflare Quick Tunnel (trycloudflare.com)
function startCloudflareTunnel() {
  if (!fs.existsSync(CLOUDFLARED_BIN)) {
    logMsg('⚠️ cloudflared.exe bulunamadı, yalnızca SSH tüneli kullanılacak.');
    return;
  }
  logMsg('☁️ Cloudflare HTTPS Tüneli başlatılıyor...');
  const cf = spawn(CLOUDFLARED_BIN, [
    'tunnel',
    '--url', `http://127.0.0.1:${PORT}`,
    '--no-autoupdate'
  ], { windowsHide: true });

  const handleCfData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match && match[0] !== primaryTunnelUrl) {
      primaryTunnelUrl = match[0];
      logMsg('✅ Birincil Cloudflare Tüneli Aktif:', primaryTunnelUrl);
      syncTunnelToGitHub();
    }
  };

  cf.stdout.on('data', handleCfData);
  cf.stderr.on('data', handleCfData);
  cf.on('close', () => {
    logMsg('🔄 Cloudflare tüneli kapandı, 3sn içinde yeniden başlatılıyor...');
    primaryTunnelUrl = '';
    setTimeout(startCloudflareTunnel, 3000);
  });
}

// 2. İkincil Yedek Tünel: localhost.run (127.0.0.1 IPv4 zorlamalı - 502 hatasını önler)
function startBackupSshTunnel() {
  logMsg('🌐 Yedek SSH HTTPS Tüneli başlatılıyor...');
  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', `80:127.0.0.1:${PORT}`,
    'nokey@localhost.run'
  ], { windowsHide: true });

  const handleSshData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match && match[0] !== backupTunnelUrl) {
      backupTunnelUrl = match[0];
      logMsg('✅ Yedek SSH Tüneli Aktif:', backupTunnelUrl);
      syncTunnelToGitHub();
    }
  };

  ssh.stdout.on('data', handleSshData);
  ssh.stderr.on('data', handleSshData);
  ssh.on('close', () => {
    logMsg('🔄 Yedek SSH tüneli yenileniyor...');
    backupTunnelUrl = '';
    setTimeout(startBackupSshTunnel, 4000);
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Bypass-Tunnel-Reminder');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = req.url.split('?')[0];

  // 1. CANLI SİSTEM DURUMU (/status)
  if (req.method === 'GET' && (url === '/status' || url === '/')) {
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
      tunnelUrl: primaryTunnelUrl || backupTunnelUrl,
      lanUrl: `http://${getLocalLanIp()}:${PORT}`,
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

  // 3.5. CANLI YAPILANDIRMA VE DİREKT OTA PAKETİ (/remote-config & /bundle)
  if (req.method === 'GET' && (url === '/remote-config' || url.startsWith('/remote-config?'))) {
    const cfgPath = path.join(__dirname, '..', 'remote-config.json');
    if (fs.existsSync(cfgPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      return res.end(fs.readFileSync(cfgPath, 'utf8'));
    }
  }

  if (req.method === 'GET' && (url === '/bundle' || url.startsWith('/bundle?'))) {
    const bundlePath = path.join(__dirname, '..', 'index.android.bundle');
    if (fs.existsSync(bundlePath)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      return res.end(fs.readFileSync(bundlePath));
    }
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
        case 'media_prev':
          ps = `$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]177); "⏮️ Önceki parçaya geçildi"`;
          break;
        case 'lock_pc':
          ps = `rundll32.exe user32.dll,LockWorkStation; "🔒 Laptop ekranı kilitlendi"`;
          break;
        case 'sleep_pc':
          ps = `rundll32.exe powrprof.dll,SetSuspendState 0,1,0; "💤 Laptop uyku moduna alındı"`;
          break;
        case 'empty_recycle_bin':
          ps = `Clear-RecycleBin -Force -ErrorAction SilentlyContinue; "🗑️ Geri Dönüşüm Kutusu temizlendi"`;
          break;
        case 'shutdown_pc':
          ps = `shutdown /s /t 15 /c "Namikaze AI tarafından kapatılıyor..."; "🔌 Laptop 15 saniye içinde kapatılacak"`;
          break;
        case 'restart_pc':
          ps = `shutdown /r /t 15 /c "Namikaze AI tarafından yeniden başlatılıyor..."; "🔄 Laptop 15 saniye içinde yeniden başlatılacak"`;
          break;
        case 'speak_text':
          if (target) {
            const escaped = target.replace(/"/g, '`"');
            ps = `$s = New-Object -ComObject SAPI.SpVoice; $s.Speak("${escaped}"); "🗣️ Laptopta seslendirildi: \"${escaped}\""`;
          }
          break;
        case 'show_notification':
          if (target) {
            const escaped = target.replace(/"/g, '`"');
            ps = `$ws = New-Object -ComObject WScript.Shell; $ws.Popup("${escaped}", 5, "Namikaze AI Bildirimi", 64); "🔔 Bildirim laptop ekranında gösterildi"`;
          }
          break;
        case 'get_clipboard':
          ps = `Get-Clipboard | Out-String;`;
          break;
        case 'set_clipboard':
          if (target) {
            const escaped = target.replace(/"/g, '`"');
            ps = `Set-Clipboard -Value "${escaped}"; "📋 Metin laptop panosuna kopyalandı"`;
          }
          break;
        case 'search_files':
          if (target) {
            ps = `Get-ChildItem -Path "$HOME\\Desktop", "$HOME\\Downloads", "$HOME\\Documents" -Filter "*${target}*" -Recurse -Depth 2 -ErrorAction SilentlyContinue | Select-Object -First 15 FullName, Length | Format-Table -AutoSize | Out-String`;
          }
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

// Dual-stack (IPv4 + IPv6) dinleme ile hem 127.0.0.1 hem ::1 hem de yerel Wi-Fi (192.168.x.x) isteklerini kabul et
server.listen(PORT, () => {
  logMsg(`⚡ Namikaze AI PC Bridge Server aktif: http://127.0.0.1:${PORT} & http://${getLocalLanIp()}:${PORT}`);
  startCloudflareTunnel();
  startBackupSshTunnel();
});
