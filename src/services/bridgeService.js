import { storageService } from './storageService';

const GITHUB_API_CONFIG_URL = 'https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json';
const RAW_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';

let cachedBridgeUrl = '';
let cachedBackupUrl = '';
let cachedLanUrl = 'http://192.168.178.59:4040';
let lastWorkingUrl = '';

export const bridgeService = {
  /**
   * GitHub üzerinden canlı laptop tünel adreslerini çeker
   */
  async fetchRemoteConfig() {
    // 1. GitHub Raw URL (taze zaman damgasıyla)
    try {
      const rawRes = await fetch(`${RAW_CONFIG_URL}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (rawRes.ok) {
        const data = await rawRes.json();
        if (data && (data.bridgeUrl || data.version)) return data;
      }
    } catch (e) {}

    // 2. GitHub REST API
    try {
      const apiRes = await fetch(`${GITHUB_API_CONFIG_URL}?ref=main&_=${Date.now()}`, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && (data.bridgeUrl || data.version)) return data;
      }
    } catch (e) {}

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
   * Hızlı Yarış (Fast Race / Cascade) ile Köprü İsteği
   * Cloudflare -> SSH Tüneli -> Yerel Wi-Fi LAN
   */
  async request(endpoint, options = {}) {
    const tryFetch = async (url, timeoutMs = 4500) => {
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

    // 1. Öncelikli olarak bilinen son çalışan adresi hızlıca dene (3.5 saniye)
    if (lastWorkingUrl) {
      try {
        return await tryFetch(lastWorkingUrl, 3500);
      } catch (e) {
        lastWorkingUrl = ''; // Eski adres çökmüş, hafızayı temizle
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
      'https://leasing-wrist-surely-athletes.trycloudflare.com', // Anlık aktif tünel
    ].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

    // Her adayı sırayla hızlı dene (3.5 saniye)
    for (const candidate of candidates) {
      try {
        return await tryFetch(candidate, 3500);
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
