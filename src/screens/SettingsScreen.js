import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';
import { bridgeService } from '../services/bridgeService';
import { updateService } from '../services/updateService';
import { APP_CONFIG } from '../config';

const CURRENT_VERSION = '3.4.0';

export default function SettingsScreen() {
  const [geminiKey, setGeminiKey] = useState('');
  const [customBridgeUrl, setCustomBridgeUrl] = useState('');
  const [activeBridgeUrl, setActiveBridgeUrl] = useState('');
  const [savedStatus, setSavedStatus] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingType, setDownloadingType] = useState(null); // 'ota' | 'apk' | null
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    setGeminiKey(s.geminiApiKey || APP_CONFIG?.GEMINI_API_KEY || '');
    setCustomBridgeUrl(s.customBridgeUrl || '');
    const discovered = await bridgeService.discoverBridgeUrl(true);
    setActiveBridgeUrl(discovered || '');
  };

  const handleSave = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    await storageService.saveSettings({
      geminiApiKey: geminiKey.trim(),
      customBridgeUrl: customBridgeUrl.trim(),
      userName: 'Omar',
      isDarkMode: true,
    });
    const discovered = await bridgeService.discoverBridgeUrl(true);
    setActiveBridgeUrl(discovered || '');
    setSavedStatus('Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSavedStatus(''), 3000);
  };

  const handleTestBridge = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setTestingKey(true);
    setTestResult(null);
    await bridgeService.discoverBridgeUrl(true);
    const status = await bridgeService.getStatus();
    if (status && status.ok) {
      const discovered = await bridgeService.discoverBridgeUrl(false);
      setActiveBridgeUrl(discovered || '');
      setTestResult({
        success: true,
        msg: `🟢 Laptop Bağlantısı Başarılı (${status.hostname} • RAM: ${status.ramUsedGB}/${status.ramTotalGB} GB • CPU: %${status.cpuPercent})`
      });
    } else {
      setTestResult({
        success: false,
        msg: `❌ Laptop köprüsüne ulaşılamadı: ${status?.error || 'Bağlantı hatası'}`
      });
    }
    setTestingKey(false);
  };

  const handleCheckUpdate = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
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
      <Header subtitle="Sistem & Yapılandırma" title="Ayarlar" />

      {/* UPDATE CENTER CARD */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Güncelleme Merkezi</Text>
          </View>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>v{CURRENT_VERSION}</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Yeni özellikler eklendiğinde tarayıcıya gitmeden tek dokunuşla güncelleyin.
        </Text>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleCheckUpdate}
          disabled={checkingUpdate || downloadingType !== null}
          activeOpacity={0.8}
        >
          {checkingUpdate ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.testBtnText}>Güncellemeleri Kontrol Et</Text>
            </View>
          )}
        </TouchableOpacity>

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
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
            </View>
          </View>
        )}

        {updateInfo && (
          <View style={{ marginTop: 14 }}>
            {updateInfo.hasUpdate ? (
              <View style={[styles.testResultBox, styles.testSuccess]}>
                <Text style={[styles.testResultText, styles.testSuccessText, { fontWeight: '700', marginBottom: 4 }]}>
                  🚀 Yeni Sürüm Hazır: v{updateInfo.latestVersion}
                </Text>
                <Text style={[styles.testResultText, styles.testSuccessText]}>
                  {updateInfo.announcement || 'Yeni özellikler ve kararlılık iyileştirmeleri hazır.'}
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 1, backgroundColor: colors.primary }]}
                    onPress={handleApplyOta}
                    disabled={downloadingType !== null}
                  >
                    <Text style={styles.saveBtnText}>⚡ Hızlı Güncelle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.testBtn, { flex: 1, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.primaryLight }]}
                    onPress={handleInstallApkDirect}
                    disabled={downloadingType !== null}
                  >
                    <Text style={[styles.testBtnText, { color: colors.primaryLight }]}>📥 APK İndir</Text>
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
          <View style={styles.statusBox}>
            <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
              {updateStatusMsg}
            </Text>
          </View>
        )}
      </View>

      {/* LAPTOP BRIDGE CONNECTION CARD */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="link-outline" size={20} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Laptop Köprü Bağlantısı</Text>
          </View>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>Otomatik Keşif</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Aktif Adres: {activeBridgeUrl || 'Otomatik aranıyor...'}
        </Text>

        <Text style={styles.label}>Özel Köprü URL (Boş bırakılırsa GitHub üzerinden otomatik bağlanır):</Text>
        <TextInput
          style={styles.input}
          value={customBridgeUrl}
          onChangeText={setCustomBridgeUrl}
          placeholder="http://192.168.178.51:4040 veya Cloudflare"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Gemini API Anahtarı:</Text>
        <TextInput
          style={styles.input}
          value={geminiKey}
          onChangeText={setGeminiKey}
          placeholder="•••••••• (Varsayılan korumalı anahtar devrede)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={true}
          autoCapitalize="none"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestBridge}
            disabled={testingKey}
            activeOpacity={0.8}
          >
            {testingKey ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="hardware-chip-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.testBtnText}>Bağlantıyı Test Et</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
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

      {/* SYSTEM INFO */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sistem & Cihaz Bilgisi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Uygulama:</Text>
          <Text style={styles.infoValue}>Namikaze AI (Laptop Control & Remote)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versiyon:</Text>
          <Text style={styles.infoValue}>v{CURRENT_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bağlı Bilgisayar:</Text>
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
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 18,
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
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  testBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  saveBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  testResultBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  testSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  testError: {
    backgroundColor: colors.dangerSoft,
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
    color: colors.dangerLight,
  },
  savedNotice: {
    color: colors.success,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusBox: {
    marginTop: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 12,
    borderRadius: 10,
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
    fontSize: 13,
    fontWeight: '600',
  },
});
