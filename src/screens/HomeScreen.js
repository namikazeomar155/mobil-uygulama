import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { bridgeService } from '../services/bridgeService';

const CURRENT_VERSION = '3.1.0';
const APK_DOWNLOAD_URL = 'https://github.com/namikazeomar155/mobil-uygulama/releases/latest/download/Namikaze-AI.apk';

export default function HomeScreen({ onNavigate }) {
  const [status, setStatus] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [loadingShot, setLoadingShot] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionToast, setActionToast] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [remoteConfig, setRemoteConfig] = useState(null);

  const loadTelemetry = async (forceRefresh = false) => {
    if (forceRefresh) {
      await bridgeService.discoverBridgeUrl(true);
    }
    const res = await bridgeService.getStatus();
    if (res && res.ok) {
      setStatus(res);
    } else {
      setStatus(null);
    }

    try {
      const cfg = await bridgeService.fetchRemoteConfig();
      if (cfg) {
        setRemoteConfig(cfg);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadTelemetry(true);
    const timer = setInterval(() => loadTelemetry(false), 8000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTelemetry(true);
    setRefreshing(false);
  };

  const handleCaptureScreen = async () => {
    setLoadingShot(true);
    const res = await bridgeService.getScreenshot();
    if (res && res.ok && res.image) {
      setScreenshot({ uri: res.image, time: res.timestamp });
    } else {
      showToast('⚠️ Ekran görüntüsü alınamadı');
    }
    setLoadingShot(false);
  };

  const handleQuickAction = async (action, target = '') => {
    showToast('⚡ Komut gönderiliyor...');
    const res = await bridgeService.sendAction(action, target);
    if (res && res.ok) {
      showToast(res.output || '✅ Komut uygulandı');
    } else {
      showToast(`❌ Hata: ${res?.error || 'Bağlantı yok'}`);
    }
  };

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(''), 3500);
  };

  const hasNewUpdate = remoteConfig?.version && remoteConfig.version !== CURRENT_VERSION;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Header
        subtitle={status ? `🟢 ${status.hostname} • BAĞLI (${status.uptimeHours}s)` : '🔴 LAPTOP BAĞLANTISI ARANIYOR...'}
        title="Namikaze AI"
        rightElement={
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => {
              showToast('🔄 Laptop köprüsü yenileniyor...');
              loadTelemetry(true);
            }}
          >
            <Text style={styles.captureBtnText}>{status ? '🟢 Bağlı' : '🔄 Bağlan'}</Text>
          </TouchableOpacity>
        }
      />

      {/* OTOMATİK GÜNCELLEME BİLDİRİMİ */}
      {hasNewUpdate && (
        <TouchableOpacity
          style={styles.updateBanner}
          onPress={() => onNavigate('settings')}
        >
          <Text style={styles.updateTitle}>🚀 Yeni Sürüm Hazır (v{remoteConfig.version})!</Text>
          <Text style={styles.updateSub}>
            Uygulama içinden tek dokunuşla sessizce güncellemek için buraya dokunun.
          </Text>
        </TouchableOpacity>
      )}

      {/* DURUM BİLDİRİM TOAST */}
      {actionToast !== '' && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{actionToast}</Text>
        </View>
      )}

      {/* CANLI DONANIM GÖSTERGELERİ (CPU / RAM / BATARYA) */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>İŞLEMCİ (CPU)</Text>
          <Text style={styles.metricValue}>{status ? `%${status.cpuPercent}` : '--'}</Text>
          <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${status?.cpuPercent || 0}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>BELLEK (RAM)</Text>
          <Text style={styles.metricValue}>{status ? `%${status.ramPercent}` : '--'}</Text>
          <Text style={styles.metricSub}>{status ? `${status.ramUsedGB}/${status.ramTotalGB} GB` : ''}</Text>
          <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${status?.ramPercent || 0}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>GÜÇ / PİL</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {status ? `%${status.batteryPercent}` : '--'}
          </Text>
          <Text style={styles.metricSub}>{status?.isCharging ? '⚡ Şarjda' : '🔋 Pilde'}</Text>
        </View>
      </View>

      {/* CANLI LAPTOP EKRAN GÖRÜNTÜSÜ (LIVE MONITOR) */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>🖥️ Canlı Laptop Ekranı</Text>
            <Text style={styles.cardSubtitle}>
              {screenshot ? `Son çekim: ${screenshot.time}` : 'Anlık masaüstü görüntüsü'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleCaptureScreen}
            disabled={loadingShot}
          >
            {loadingShot ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.captureBtnText}>📸 Ekranı Çek</Text>
            )}
          </TouchableOpacity>
        </View>

        {screenshot ? (
          <TouchableOpacity onPress={handleCaptureScreen} activeOpacity={0.9}>
            <Image
              source={{ uri: screenshot.uri }}
              style={styles.screenshotImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptyMonitor} onPress={handleCaptureScreen}>
            <Text style={styles.emptyMonitorIcon}>💻</Text>
            <Text style={styles.emptyMonitorText}>
              Laptop ekranını telefonunda görmek için dokun
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* HIZLI MEDYA & SES KUMANDASI */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🎛️ Hızlı Medya & Sistem Kumandası</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_down')}>
            <Text style={styles.deckIcon}>🔉</Text>
            <Text style={styles.deckLabel}>Ses Kıs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_mute')}>
            <Text style={styles.deckIcon}>🔇</Text>
            <Text style={styles.deckLabel}>Sessiz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_up')}>
            <Text style={styles.deckIcon}>🔊</Text>
            <Text style={styles.deckLabel}>Ses Aç</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridRow, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('media_play_pause')}>
            <Text style={styles.deckIcon}>⏯️</Text>
            <Text style={styles.deckLabel}>Oynat/Durdur</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('media_next')}>
            <Text style={styles.deckIcon}>⏭️</Text>
            <Text style={styles.deckLabel}>Sonraki</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deckBtn, { borderColor: colors.danger }]}
            onPress={() => handleQuickAction('lock_pc')}
          >
            <Text style={styles.deckIcon}>🔒</Text>
            <Text style={[styles.deckLabel, { color: '#F87171' }]}>PC Kilitle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LAPTOPTA SİTE VEYA UYGULAMA BAŞLAT */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🚀 Laptopta Hızlı Başlat</Text>
        <View style={styles.urlRow}>
          <TextInput
            style={styles.urlInput}
            placeholder="Web adresi yaz (örn: youtube.com)..."
            placeholderTextColor={colors.textMuted}
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.urlBtn}
            onPress={() => {
              if (urlInput.trim()) {
                handleQuickAction('open_url', urlInput.trim());
                setUrlInput('');
              }
            }}
          >
            <Text style={styles.urlBtnText}>Aç ↗</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickLaunchRow}>
          {[
            { label: '▶️ YouTube', act: 'open_url', val: 'https://youtube.com' },
            { label: '🐙 GitHub', act: 'open_url', val: 'https://github.com' },
            { label: '🧮 Hesap Mak.', act: 'launch_app', val: 'calc.exe' },
            { label: '📝 Not Defteri', act: 'launch_app', val: 'notepad.exe' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.launchChip}
              onPress={() => handleQuickAction(item.act, item.val)}
            >
              <Text style={styles.launchChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ANTIGRAVITY AI KOMUTAN KISAYOLU */}
      <TouchableOpacity style={styles.aiBanner} onPress={() => onNavigate('chat')}>
        <View style={styles.aiBannerIconWrap}>
          <Text style={styles.aiBannerIcon}>🤖</Text>
        </View>
        <View style={styles.aiBannerTextWrap}>
          <Text style={styles.aiBannerTitle}>Antigravity & AI Komutanına Yaz</Text>
          <Text style={styles.aiBannerSubtitle}>
            Doğal dille laptopta komut çalıştır veya Antigravity'ye görev gönder.
          </Text>
        </View>
        <Text style={styles.aiBannerArrow}>→</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
  },
  updateBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  updateTitle: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 15,
  },
  updateSub: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
  },
  toastBox: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  miniBarBg: {
    height: 5,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  captureBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  screenshotImg: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  emptyMonitor: {
    height: 150,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMonitorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyMonitorText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  deckBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  deckIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  deckLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  urlRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  urlInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  urlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quickLaunchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  launchChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  launchChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  aiBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  aiBannerIcon: {
    fontSize: 22,
  },
  aiBannerTextWrap: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  aiBannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiBannerArrow: {
    fontSize: 20,
    color: colors.primaryLight,
    marginLeft: 8,
  },
});
