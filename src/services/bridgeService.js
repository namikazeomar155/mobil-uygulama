import { storageService } from './storageService';

const GITHUB_API_CONFIG_URL = 'https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json';
const RAW_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';

let cachedBridgeUrl = '';
let cachedBackupUrl = '';
let cachedLanUrl = 'http://192.168.178.51:4040';
let lastWorkingUrl = '';

export const bridgeService = {
  /**
   * Canlı laptop tünel adreslerini çeker (GitHub Raw -> GitHub API -> Yerel LAN)
   */
  async fetchRemoteConfig() {
    const fetchWithTimeout = async (url, headers = {}, timeoutMs = 4000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            Pragma: 'no-cache',
            ...headers,
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) return await res.json();
      } catch (e) {
        clearTimeout(timer);
      }
      return null;
    };

    // 1. GitHub Raw URL (hızlı 3.5s zaman aşımı)
    const rawData = await fetchWithTimeout(`${RAW_CONFIG_URL}?_t=${Date.now()}`);
    if (rawData && (rawData.bridgeUrl || rawData.version)) {
      return rawData;
    }

    // 2. GitHub REST API (GitHub mobil istemcilerde User-Agent başlığını zorunlu tutar)
    const apiData = await fetchWithTimeout(
      `${GITHUB_API_CONFIG_URL}?ref=main&_t=${Date.now()}`,
      {
        Accept: 'application/vnd.github.raw+json',
        'User-Agent': 'Namikaze-AI-Mobile-Client',
      }
    );
    if (apiData && (apiData.bridgeUrl || apiData.version)) {
      return apiData;
    }

    // 3. Yerel Wi-Fi ağı üzerindeyse doğrudan laptoptan çek
    const lanData = await fetchWithTimeout(`${cachedLanUrl}/remote-config?_t=${Date.now()}`, {}, 2000);
    if (lanData && (lanData.bridgeUrl || lanData.version)) {
      return lanData;
    }

    return null;
  },

  async discoverBridgeUrl(forceRefresh = false) {
    try {
      const settings = await storageService.getSettings();
      const customUrl = (settings.customBridgeUrl || '').trim().replace(/\/$/, '');

      if (!forceRefresh && lastWorkingUrl) {
        return lastWorkingUrl;
      }

      const cfg = await this.fetchRemoteConfig();
      if (cfg) {
        if (cfg.bridgeUrl) cachedBridgeUrl = cfg.bridgeUrl.replace(/\/$/, '');
        if (cfg.backupTunnelUrl) cachedBackupUrl = cfg.backupTunnelUrl.replace(/\/$/, '');
        if (cfg.lanUrl) cachedLanUrl = cfg.lanUrl.replace(/\/$/, '');
      }

      return customUrl || cachedBridgeUrl || cachedBackupUrl || cachedLanUrl;
    } catch (e) {
      return cachedBridgeUrl || cachedBackupUrl || cachedLanUrl;
    }
  },

  /**
   * Çoklu Tünel & Yedekli Köprü İsteği
   * Özel URL -> Cloudflare Quick Tunnel -> SSH Tunnel -> Yerel Wi-Fi LAN
   */
  async request(endpoint, options = {}) {
    const isScreenshot = endpoint === '/screenshot';
    // Ekran görüntüsü Windows render + Base64 aktarımı nedeniyle 15 saniye alır; sistem telemetrisi 5.5 saniye
    const defaultTimeout = isScreenshot ? 15000 : 5500;

    const tryFetch = async (url, timeoutMs = defaultTimeout) => {
      if (!url) throw new Error('Boş URL');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${url}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            ...(options.headers || {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        lastWorkingUrl = url;
        return json;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    };

    // 1. Öncelikli olarak bilinen son çalışan adresi dene
    if (lastWorkingUrl) {
      try {
        return await tryFetch(lastWorkingUrl);
      } catch (e) {
        // Ekran görüntüsü gecikti diye köprü bağlantısını koparma
        if (!isScreenshot) {
          lastWorkingUrl = '';
        }
      }
    }

    // 2. Taze yapılandırmayı çek
    await this.discoverBridgeUrl(true);
    const settings = await storageService.getSettings().catch(() => ({}));
    const customUrl = (settings?.customBridgeUrl || '').trim().replace(/\/$/, '');

    // Sıralı Aday Listesi
    const candidates = [
      customUrl,
      cachedBridgeUrl,
      cachedBackupUrl,
      cachedLanUrl,
      'http://192.168.178.51:4040',
    ].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

    // Her adayı sırayla dene
    for (const candidate of candidates) {
      try {
        return await tryFetch(candidate);
      } catch (err) {
        // Sonraki adaya geç
      }
    }

    return {
      ok: false,
      error: 'Laptop köprüsüne ulaşılamadı. Bilgisayarınızın açık ve internete bağlı olduğundan emin olun.',
    };
  },

  async getStatus() {
    return await this.request('/status', { method: 'GET' });
  },

  async getScreenshot() {
    return await this.request('/screenshot', { method: 'GET' });
  },

  async getProcesses() {
    return await this.request('/processes', { method: 'GET' });
  },

  async sendAction(action, target = '') {
    return await this.request('/action', {
      method: 'POST',
      body: JSON.stringify({ action, target }),
    });
  },

  async execPowerShell(command) {
    return await this.request('/exec', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },
};
