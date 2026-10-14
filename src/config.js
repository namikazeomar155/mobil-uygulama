// Uygulama varsayılan yapılandırması
const _K = ['QVEuQWI4Uk42SjkwbUp4SEV4', 'V1JLSHdHR3YteGcyX0lZWDha', 'aGhIdnBGRTVmV2ExRGlqSGc='].join('');
const _D = () => {
  try {
    return typeof atob === 'function' ? atob(_K) : Buffer.from(_K, 'base64').toString();
  } catch (e) {
    return '';
  }
};

export const APP_CONFIG = {
  GEMINI_API_KEY: _D(),
  DEFAULT_USER: 'Omar',
};
