import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';
import { bridgeService } from '../services/bridgeService';
import { updateService } from '../services/updateService';
import { APP_CONFIG } from '../config';

const CURRENT_VERSION = '3.2.0';
const APK_DOWNLOAD_URL = 'https://github.com/namikazeomar155/mobil-uygulama/releases/latest/download/Namikaze-AI.apk';

export default function SettingsScreen() {
  const [geminiKey, setGeminiKey] = useState('');
  const [customBridgeUrl, setCustomBridgeUrl] = useState('');
  const [activeBridgeUrl, setActiveBridgeUrl] = useState('');
  const [savedStatus, setSavedStatus] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    setGeminiKey(s.geminiApiKey || '');
    setCustomBridgeUrl(s.customBridgeUrl || '');
    const discovered = await bridgeService.discoverBridgeUrl(true);
    setActiveBridgeUrl(discovered || '');
  };

  const handleSave = async () => {
    await storageService.saveSettings({
      geminiApiKey: geminiKey.trim(),
      customBridgeUrl: customBridgeUrl.trim(),
      userName: 'Omar',
      isDarkMode: true,
    });
    const discovered = await bridgeService.discoverBridgeUrl(true);
    setActiveBridgeUrl(discovered || '');
    setSavedStatus('✅ Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSavedStatus(''), 3000);
  };

  const handleTestBridge = async () => {
    setTestingKey(true);
    setTestResult(null);
    await bridgeService.discoverBridgeUrl(true);
    const status = await bridgeService.getStatus();
    if (status && status.ok) {
      const discovered = await bridgeService.discoverBridgeUrl(false);
      setActiveBridgeUrl(discovered || '');
      setTestResult({
        success: true,
        msg: `🟢 Laptop Bağlantısı Başarılı! (${status.hostname} • RAM: ${status.ramUsedGB}/${status.ramTotalGB} GB)`
      });
    } else {
      setTestResult({
        success: false,
        msg: `❌ Laptop köprüsüne ulaşılamadı: ${status?.error || 'Bağlantı hatası'}`
      });
    }
    setTestingKey(false);
  };

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingType, setDownloadingType] = useState(null); // 'ota' | 'apk' | null
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    setUpdateStatusMsg('');
    try {
      const res = await updateService.checkUpdates(CURRENT_VERSION);
      if (res && res.ok) {
        setUpdateInfo(res);
      } else {
        setUpdateStatusMsg('Güncelleme sunucusuna ulaşılamadı.');
      }
    } catch (e) {
      setUpdateStatusMsg('Güncelleme kontrolü başarısız.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyOta = async () => {
    if (!updateInfo?.bundleUrl) return;
    setDownloadingType('ota');
    setDownloadProgress(0);
    setUpdateStatusMsg('⚡ Yeni özellik paketi indiriliyor...');
    const res = await updateService.downloadAndApplyOta(
      updateInfo.bundleUrl,
      updateInfo.latestVersion,
      (pct) => setDownloadProgress(pct)
    );
    if (res.ok) {
      setUpdateStatusMsg(res.message);
    } else {
      setUpdateStatusMsg(`❌ Hata: ${res.error}`);
    }
    setDownloadingType(null);
  };

  const handleInstallApkDirect = async () => {
    if (!updateInfo?.apkUrl) return;
    setDownloadingType('apk');
    setDownloadProgress(0);
    setUpdateStatusMsg('📥 APK doğrudan indiriliyor...');
    const res = await updateService.downloadAndInstallApk(
      updateInfo.apkUrl,
      (pct) => setDownloadProgress(pct)
    );
    if (res.ok) {
      setUpdateStatusMsg('✅ Yükleyici açıldı. Ekrana gelen "Güncelle" butonuna basmanız yeterlidir.');
    } else {
      setUpdateStatusMsg(`❌ Hata: ${res.error}`);
    }
    setDownloadingType(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Header subtitle="Sistem & Güncelleme" title="Ayarlar ⚙️" />

      {/* UYGULAMA GÜNCELLEME MERKEZİ */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.cardTitle}>Uygulama Güncelleme Merkezi 🔄</Text>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>v{CURRENT_VERSION}</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Yeni özellikler eklendiğinde tarayıcıya gitmeden veya eski uygulamayı silmeden tek dokunuşla güncelleyebilirsiniz.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate || downloadingType !== null}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.testBtnText}>🔍 Güncelleme Kontrol Et</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* İNDİRME İLERLEME ÇUBUĞU */}
        {downloadingType !== null && (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '700' }}>
                {downloadingType === 'ota' ? '⚡ Sessiz Güncelleme İndiriliyor...' : '📥 APK İndiriliyor...'}
              </Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>
                %{downloadProgress}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${downloadProgress}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 4 }} />
            </View>
          </View>
        )}

        {/* BİLGİ VE GÜNCELLEME AKSİYONLARI */}
        {updateInfo && (
          <View style={{ marginTop: 14 }}>
            {updateInfo.hasUpdate ? (
              <View style={[styles.testResultBox, styles.testSuccess]}>
                <Text style={[styles.testResultText, styles.testSuccessText, { fontWeight: '700', marginBottom: 6 }]}>
                  🚀 Yeni Sürüm Hazır: v{updateInfo.latestVersion}
                </Text>
                <Text style={[styles.testResultText, styles.testSuccessText]}>
                  {updateInfo.announcement || 'Yeni özellikler ve kararlılık iyileştirmeleri eklendi.'}
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                  {/* 1. OTA GÜNCELLEME BUTONU */}
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 1, backgroundColor: colors.primary }]}
                    onPress={handleApplyOta}
                    disabled={downloadingType !== null}
                  >
                    <Text style={styles.saveBtnText}>⚡ Hızlı Güncelle (Kurulumsuz)</Text>
                  </TouchableOpacity>

                  {/* 2. UYGULAMA İÇİ DOĞRUDAN APK BUTONU */}
                  <TouchableOpacity
                    style={[styles.testBtn, { flex: 1, borderColor: colors.primary }]}
                    onPress={handleInstallApkDirect}
                    disabled={downloadingType !== null}
                  >
                    <Text style={[styles.testBtnText, { color: colors.primaryLight }]}>📥 APK İle Güncelle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.testResultBox, styles.testSuccess]}>
                <Text style={[styles.testResultText, styles.testSuccessText]}>
                  ✅ Uygulamanız en son sürümde (v{CURRENT_VERSION}).
                </Text>
              </View>
            )}
          </View>
        )}

        {updateStatusMsg !== '' && (
          <View style={[styles.testResultBox, { backgroundColor: 'rgba(232, 122, 74, 0.15)', borderWidth: 1, borderColor: colors.primary }]}>
            <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
              {updateStatusMsg}
            </Text>
          </View>
        )}
      </View>

      {/* LAPTOP KÖPRÜ BAĞLANTISI */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.cardTitle}>Laptop Köprü Bağlantısı 💻</Text>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>⚡ Otomatik Keşif</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Aktif Köprü Adresi: {activeBridgeUrl || 'Otomatik aranıyor...'}
        </Text>

        <Text style={styles.label}>Özel Köprü URL (Boş bırakılırsa GitHub'dan otomatik bulur):</Text>
        <TextInput
          style={styles.input}
          value={customBridgeUrl}
          onChangeText={setCustomBridgeUrl}
          placeholder="Otomatik (Cloudflare / SSH Tünel)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Özel Gemini API Anahtarı (Gömülü anahtar korumalıdır):</Text>
        <TextInput
          style={styles.input}
          value={geminiKey}
          onChangeText={setGeminiKey}
          placeholder="•••••••• (Varsayılan korumalı anahtar aktif)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={true}
          autoCapitalize="none"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestBridge}
            disabled={testingKey}
          >
            {testingKey ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.testBtnText}>🔌 Laptopu Test Et</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        {testResult && (
          <View
            style={[
              styles.testResultBox,
              testResult.success ? styles.testSuccess : styles.testError,
            ]}
          >
            <Text
              style={[
                styles.testResultText,
                testResult.success ? styles.testSuccessText : styles.testErrorText,
              ]}
            >
              {testResult.msg}
            </Text>
          </View>
        )}

        {savedStatus !== '' && (
          <Text style={styles.savedNotice}>{savedStatus}</Text>
        )}
      </View>

      {/* UYGULAMA HAKKINDA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sistem Bilgisi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Uygulama:</Text>
          <Text style={styles.infoValue}>Namikaze AI (PC & Antigravity Remote)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versiyon:</Text>
          <Text style={styles.infoValue}>v{CURRENT_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hedef Bilgisayar:</Text>
          <Text style={styles.infoValue}>DESKTOP-3EQ1SQ5</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  secureBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  secureBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  testBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  savedNotice: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  testResultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  testSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  testError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  testResultText: {
    fontSize: 12,
    lineHeight: 18,
  },
  testSuccessText: {
    color: colors.success,
  },
  testErrorText: {
    color: '#F87171',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});
