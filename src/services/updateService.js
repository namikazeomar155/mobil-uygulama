import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const GITHUB_CONFIG_URL = 'https://api.github.com/repos/namikazeomar155/mobil-uygulama/contents/remote-config.json';
const RAW_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';
const OTA_DIR = `${FileSystem.documentDirectory}ota/`;
const OTA_BUNDLE_PATH = `${OTA_DIR}index.android.bundle`;
const STORAGE_OTA_KEY = '@namikaze_ota_version';

export const updateService = {
  /**
   * GitHub üzerinden en güncel sürüm ve OTA bilgilerini çeker
   */
  async checkUpdates(currentAppVersion = '3.0.0') {
    let remote = null;
    try {
      const res = await fetch(`${GITHUB_CONFIG_URL}?ref=main&_=${Date.now()}`, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        remote = await res.json();
      }
    } catch (e) {}

    if (!remote) {
      try {
        const rawRes = await fetch(`${RAW_CONFIG_URL}?t=${Date.now()}`);
        if (rawRes.ok) remote = await rawRes.json();
      } catch (e) {}
    }

    if (!remote) {
      return { ok: false, error: 'Güncelleme sunucusuna bağlanılamadı.' };
    }

    const localOtaVersion = await AsyncStorage.getItem(STORAGE_OTA_KEY);
    const activeVersion = localOtaVersion || currentAppVersion;
    const targetVersion = remote.version || '3.0.0';
    const hasNewVersion = targetVersion !== activeVersion;

    return {
      ok: true,
      hasUpdate: hasNewVersion,
      currentVersion: activeVersion,
      latestVersion: targetVersion,
      announcement: remote.announcement || '',
      bundleUrl: remote.bundleUrl || 'https://github.com/namikazeomar155/mobil-uygulama/releases/latest/download/index.android.bundle',
      apkUrl: remote.apkUrl || 'https://github.com/namikazeomar155/mobil-uygulama/releases/latest/download/Namikaze-AI.apk',
      isOtaSupported: Platform.OS === 'android',
    };
  },

  /**
   * 1. YÖNTEM: Uygulama İçi Sessiz / Yeniden Kurulumsuz Güncelleme (OTA)
   * Yeni JavaScript paketini arka planda indirir ve kaydeder.
   */
  async downloadAndApplyOta(bundleUrl, targetVersion, onProgress) {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('OTA güncelleme Android ortamında desteklenir.');
      }

      const dirInfo = await FileSystem.getInfoAsync(OTA_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OTA_DIR, { intermediates: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        `${bundleUrl}?t=${Date.now()}`,
        OTA_BUNDLE_PATH,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0 && onProgress) {
            const percent = Math.round(
              (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
            );
            onProgress(percent);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('İndirme tamamlanamadı.');
      }

      await AsyncStorage.setItem(STORAGE_OTA_KEY, targetVersion);
      return {
        ok: true,
        message: '✅ Güncelleme başarıyla indirildi! Uygulama bir sonraki açılışta veya yeniden başlatıldığında yeni sürümle açılacak.',
      };
    } catch (e) {
      return { ok: false, error: e.message || 'OTA indirme hatası' };
    }
  },

  /**
   * 2. YÖNTEM: Uygulama İçi Doğrudan APK İndirici & Yükleyici
   * Tarayıcıyı açmadan doğrudan uygulama içinde APK'yı indirir ve Android kurulum ekranını başlatır.
   */
  async downloadAndInstallApk(apkUrl, onProgress) {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('APK kurulumu yalnızca Android cihazlarda geçerlidir.');
      }

      const localApkPath = `${FileSystem.cacheDirectory}Namikaze-AI.apk`;
      const fileInfo = await FileSystem.getInfoAsync(localApkPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localApkPath, { idempotent: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        `${apkUrl}?t=${Date.now()}`,
        localApkPath,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0 && onProgress) {
            const percent = Math.round(
              (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
            );
            onProgress(percent);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('APK dosyası indirilemedi.');
      }

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      return { ok: true, message: 'Yükleyici başlatıldı.' };
    } catch (e) {
      return { ok: false, error: e.message || 'Kurulum başlatılamadı' };
    }
  },

  /**
   * OTA Güncellemesini Temizle (Orijinal APK'ya Geri Dön)
   */
  async clearOtaUpdate() {
    try {
      await FileSystem.deleteAsync(OTA_BUNDLE_PATH, { idempotent: true });
      await AsyncStorage.removeItem(STORAGE_OTA_KEY);
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  },
};
