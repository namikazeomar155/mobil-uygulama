import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';

export default function SettingsScreen() {
  const [geminiKey, setGeminiKey] = useState('');
  const [userName, setUserName] = useState('');
  const [savedStatus, setSavedStatus] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    setGeminiKey(s.geminiApiKey || '');
    setUserName(s.userName || 'Kullanıcı');
  };

  const handleSave = async () => {
    await storageService.saveSettings({
      geminiApiKey: geminiKey.trim(),
      userName: userName.trim() || 'Kullanıcı',
      isDarkMode: true,
    });
    setSavedStatus('✅ Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSavedStatus(''), 3000);
  };

  const handleTestKey = async () => {
    if (!geminiKey.trim()) {
      setTestResult({ success: false, msg: 'Lütfen test etmek için önce bir API anahtarı girin.' });
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Selam!' }] }]
        })
      });

      if (response.ok) {
        setTestResult({ success: true, msg: '🎉 Harika! Gemini API anahtarı başarıyla doğrulandı.' });
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

      {/* API ANAHTARI ENTEGRASYONU */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yapay Zeka API Anahtarı</Text>
        <Text style={styles.description}>
          Aura Chat'in canlı Google Gemini modeline bağlanması için API anahtarınızı buraya girebilirsiniz.
        </Text>

        <Text style={styles.label}>Google Gemini API Key:</Text>
        <TextInput
          style={styles.input}
          value={geminiKey}
          onChangeText={setGeminiKey}
          placeholder="AIzaSy..."
          placeholderTextColor={colors.textMuted}
          secureTextEntry={false}
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
              <Text style={styles.testBtnText}>⚡ Anahtarı Test Et</Text>
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
        <Text style={styles.cardTitle}>Uygulama Bilgisi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Uygulama:</Text>
          <Text style={styles.infoValue}>Aura Life Companion</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versiyon:</Text>
          <Text style={styles.infoValue}>v1.0.0 (Release)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Framework:</Text>
          <Text style={styles.infoValue}>React Native / Expo 52</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Çalışma Modu:</Text>
          <Text style={styles.infoValue}>Çapraz Platform (iOS & Android)</Text>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
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
    paddingHorizontal: 20,
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
