import { storageService } from './storageService';

const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';

let cachedBridgeUrl = '';
let cachedLanUrl = 'http://192.168.178.59:4040';

export const bridgeService = {
  /**
   * GitHub üzerinden en güncel canlı laptop tünel adresini çeker
   */
  async discoverBridgeUrl(forceRefresh = false) {
    try {
      const settings = await storageService.getSettings();
      if (settings.customBridgeUrl && settings.customBridgeUrl.trim() !== '') {
        return settings.customBridgeUrl.trim().replace(/\/$/, '');
      }

      if (cachedBridgeUrl && !forceRefresh) {
        return cachedBridgeUrl;
      }

      const res = await fetch(`${REMOTE_CONFIG_URL}?t=${Date.now()}`);
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.bridgeUrl) {
          cachedBridgeUrl = cfg.bridgeUrl.replace(/\/$/, '');
        }
        if (cfg.lanUrl) {
          cachedLanUrl = cfg.lanUrl.replace(/\/$/, '');
        }
      }
      return cachedBridgeUrl || cachedLanUrl;
    } catch (e) {
      return cachedBridgeUrl || cachedLanUrl;
    }
  },

  /**
   * Otomatik yeniden denemeli (Auto-Retry) köprü isteği
   */
  async request(endpoint, options = {}) {
    let baseUrl = await this.discoverBridgeUrl(false);

    const tryFetch = async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`${url}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    };

    try {
      return await tryFetch(baseUrl);
    } catch (firstErr) {
      // Tünel adresi yenilenmiş olabilir, GitHub'dan taze adresi çekip tekrar dene
      try {
        const freshUrl = await this.discoverBridgeUrl(true);
        if (freshUrl && freshUrl !== baseUrl) {
          return await tryFetch(freshUrl);
        }
        // Aynı Wi-Fi üzerindeyse yerel LAN IP'sini dene
        return await tryFetch(cachedLanUrl);
      } catch (secondErr) {
        return {
          ok: false,
          error: 'Laptop köprüsüne ulaşılamadı. Bilgisayarınızın açık olduğundan emin olun.',
        };
      }
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
