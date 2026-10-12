import { storageService } from './storageService';

const GITHUB_API_CONFIG_URL = 'https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json';
const RAW_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';

let cachedBridgeUrl = '';
let cachedBackupUrl = '';
let cachedLanUrl = 'http://192.168.178.59:4040';
let lastWorkingUrl = '';

export const bridgeService = {
  /**
   * GitHub API üzerinden (0 saniye önbellek gecikmesiyle) canlı laptop tünel adreslerini çeker
   */
  async fetchRemoteConfig() {
    // 1. Önce GitHub REST API (CDN önbelleğine takılmaz, anında güncel veriyi döner)
    try {
      const apiRes = await fetch(`${GITHUB_API_CONFIG_URL}?ref=main&_=${Date.now()}`, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && (data.bridgeUrl || data.version)) {
          return data;
        }
      }
    } catch (e) {}

    // 2. Yedek: GitHub Raw URL
    try {
      const rawRes = await fetch(`${RAW_CONFIG_URL}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (rawRes.ok) {
        return await rawRes.json();
      }
    } catch (e) {}

    return null;
  },

  async discoverBridgeUrl(forceRefresh = false) {
    try {
      const settings = await storageService.getSettings();
      if (settings.customBridgeUrl && settings.customBridgeUrl.trim() !== '') {
        return settings.customBridgeUrl.trim().replace(/\/$/, '');
      }

      if (lastWorkingUrl && !forceRefresh) {
        return lastWorkingUrl;
      }

      const cfg = await this.fetchRemoteConfig();
      if (cfg) {
        if (cfg.bridgeUrl) cachedBridgeUrl = cfg.bridgeUrl.replace(/\/$/, '');
        if (cfg.backupTunnelUrl) cachedBackupUrl = cfg.backupTunnelUrl.replace(/\/$/, '');
        if (cfg.lanUrl) cachedLanUrl = cfg.lanUrl.replace(/\/$/, '');
      }

      return cachedBridgeUrl || cachedBackupUrl || cachedLanUrl;
    } catch (e) {
      return cachedBridgeUrl || cachedBackupUrl || cachedLanUrl;
    }
  },

  /**
   * Çoklu Tünel & Otomatik Yedekli (Cloudflare -> SSH Tunnel -> Yerel Wi-Fi LAN) Köprü İsteği
   */
  async request(endpoint, options = {}) {
    const tryFetch = async (url, timeoutMs = 9000) => {
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

    // 1. Önce bilinen en son çalışan veya keşfedilen birincil adresi dene
    const primaryUrl = await this.discoverBridgeUrl(false);
    try {
      return await tryFetch(primaryUrl, 8000);
    } catch (firstErr) {
      // 2. Başarısız olursa GitHub API'den taze tünel listesini çek ve tüm adayları sırayla dene
      await this.discoverBridgeUrl(true);
      const candidates = [
        cachedBridgeUrl,
        cachedBackupUrl,
        cachedLanUrl,
      ].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

      for (const candidate of candidates) {
        try {
          return await tryFetch(candidate, 7000);
        } catch (err) {
          // Sonraki adaya geç
        }
      }

      return {
        ok: false,
        error: 'Laptop köprüsüne ulaşılamadı. Bilgisayarınızın açık ve internete bağlı olduğundan emin olun.',
      };
    }
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
