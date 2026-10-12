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
import { APP_CONFIG } from '../config';

const CURRENT_VERSION = '1.1.0';
const APK_DOWNLOAD_URL = 'https://github.com/namikazeomar155/mobil-uygulama/releases/latest/download/Aura-AI.apk';
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/namikazeomar155/mobil-uygulama/main/remote-config.json';

export default function SettingsScreen() {
  const [geminiKey, setGeminiKey] = useState('');
  const [userName, setUserName] = useState('');
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
    setUserName(s.userName || 'Dostum');
  };

  const handleSave = async () => {
    await storageService.saveSettings({
      geminiApiKey: geminiKey.trim(),
      userName: userName.trim() || 'Dostum',
      isDarkMode: true,
    });
    setSavedStatus('✅ Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSavedStatus(''), 3000);
  };

  const handleTestKey = async () => {
    const keyToTest = geminiKey.trim() || APP_CONFIG?.GEMINI_API_KEY || '';
    if (!keyToTest) {
      setTestResult({ success: false, msg: 'Test edilecek bir API anahtarı bulunamadı.' });
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${keyToTest}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Selam!' }] }]
        })
      });

      if (response.ok) {
        setTestResult({ success: true, msg: '🎉 Harika! Aura AI bulut bağlantısı aktif ve sorunsuz çalışıyor.' });
      } else {
        const err = await response.json().catch(() => ({}));
        setTestResult({
          success: false,
          msg: `❌ Bağlantı başarısız (${response.status}): ${err.error?.message || 'Geçersiz anahtar.'}`
        });
      }
    } catch (e) {
      setTestResult({ success: false, msg: `❌ Ağ hatası: ${e.message}` });
    } finally {
      setTestingKey(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const res = await fetch(`${REMOTE_CONFIG_URL}?t=${Date.now()}`);
      if (res.ok) {
        const remote = await res.json();
        if (remote.version && remote.version !== CURRENT_VERSION) {
          setUpdateInfo({
            hasUpdate: true,
            msg: `🚀 Yeni sürüm (v${remote.version}) mevcut! Eski uygulamayı silmeden doğrudan üzerine kurabilirsiniz.`
          });
        } else {
          setUpdateInfo({
            hasUpdate: false,
            msg: `✅ Uygulamanız güncel (v${CURRENT_VERSION}). Yine de son APK'yı indirmek isterseniz aşağıdaki butonu kullanabilirsiniz.`
          });
        }
      }
    } catch (e) {
      setUpdateInfo({
        hasUpdate: false,
        msg: 'Güncelleme sunucusuna ulaşılamadı.'
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Header subtitle="Yapılandırma" title="Ayarlar ⚙️" />

      {/* KULLANICI PROFİLİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profil Bilgileri</Text>
        <Text style={styles.label}>Görünen İsim:</Text>
        <TextInput
          style={styles.input}
          value={userName}
          onChangeText={setUserName}
          placeholder="İsminizi yazın..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* API ANAHTARI ENTEGRASYONU (GİZLİ KORUMALI) */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.cardTitle}>Yapay Zeka Bağlantısı</Text>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>🔒 Gizli Anahtar Aktif</Text>
          </View>
        </View>
        <Text style={styles.description}>
          Uygulama içinde gömülü ve şifreli Aura AI bağlantısı varsayılan olarak aktiftir. Yalnızca kendi özel anahtarınızı kullanmak isterseniz aşağıya girebilirsiniz:
        </Text>

        <Text style={styles.label}>Özel API Anahtarı (Opsiyonel):</Text>
        <TextInput
          style={styles.input}
          value={geminiKey}
          onChangeText={setGeminiKey}
          placeholder="•••••••• (Varsayılan korumalı anahtar kullanılıyor)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={true}
          autoCapitalize="none"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestKey}
            disabled={testingKey}
          >
            {testingKey ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.testBtnText}>⚡ Bağlantıyı Test Et</Text>
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

      {/* UYGULAMA GÜNCELLEME MERKEZİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uygulama Güncelleme Merkezi 🔄</Text>
        <Text style={styles.description}>
          Uygulamaya yeni özellikler eklendiğinde eski uygulamayı silmenize gerek yoktur; yeni APK'yı indirip açtığınızda verileriniz silinmeden doğrudan güncellenir.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.testBtnText}>🔍 Güncelleme Kontrol Et</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}
          >
            <Text style={styles.saveBtnText}>📥 Son APK'yı İndir</Text>
          </TouchableOpacity>
        </View>

        {updateInfo && (
          <View style={[styles.testResultBox, styles.testSuccess]}>
            <Text style={[styles.testResultText, styles.testSuccessText]}>
              {updateInfo.msg}
            </Text>
          </View>
        )}
      </View>

      {/* UYGULAMA HAKKINDA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uygulama Bilgisi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Uygulama:</Text>
          <Text style={styles.infoValue}>Aura Life Companion</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versiyon:</Text>
          <Text style={styles.infoValue}>v{CURRENT_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>AI Motoru:</Text>
          <Text style={styles.infoValue}>Gemini 3.8 Flash (Korumalı)</Text>
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
