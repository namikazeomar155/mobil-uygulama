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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { bridgeService } from '../services/bridgeService';

const CURRENT_VERSION = '3.4.0';

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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    await loadTelemetry(true);
    setRefreshing(false);
  };

  const handleCaptureScreen = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setLoadingShot(true);
    const res = await bridgeService.getScreenshot();
    if (res && res.ok && res.image) {
      setScreenshot({ uri: res.image, time: res.timestamp });
    } else {
      const errMsg = res?.error || 'Ekran görüntüsü alınamadı';
      showToast(`⚠️ ${errMsg}`);
    }
    setLoadingShot(false);
  };

  const handleQuickAction = async (action, target = '') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    showToast('⚡ Komut iletiliyor...');
    const res = await bridgeService.sendAction(action, target);
    if (res && res.ok) {
      showToast(res.output || '✅ Komut uygulandı');
    } else {
      showToast(`❌ Hata: ${res?.error || 'Laptop bağlantısı yok'}`);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
    >
      <Header
        subtitle={status ? `🟢 ${status.hostname} • BAĞLI` : '🔴 BAĞLANTI BEKLENİYOR'}
        title="Namikaze AI"
        rightElement={
          <TouchableOpacity
            style={[styles.statusPillBtn, status ? styles.statusPillConnected : styles.statusPillDisconnected]}
            onPress={() => {
              showToast('🔄 Laptop bağlantısı kontrol ediliyor...');
              loadTelemetry(true);
            }}
          >
            <Ionicons
              name={status ? 'checkmark-circle' : 'refresh-circle'}
              size={16}
              color={status ? colors.success : colors.danger}
            />
            <Text style={[styles.statusPillText, { color: status ? colors.success : colors.danger }]}>
              {status ? 'Bağlı' : 'Yenile'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* UPDATE BANNER */}
      {hasNewUpdate && (
        <TouchableOpacity
          style={styles.updateBanner}
          onPress={() => onNavigate('settings')}
          activeOpacity={0.8}
        >
          <View style={styles.updateIconWrap}>
            <Ionicons name="sparkles" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.updateTitle}>Yeni Sürüm Hazır (v{remoteConfig.version})</Text>
            <Text style={styles.updateSub}>Ayarlardan tek dokunuşla güncelleyin.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.success} />
        </TouchableOpacity>
      )}

      {/* TOAST NOTIFICATION */}
      {actionToast !== '' && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{actionToast}</Text>
        </View>
      )}

      {/* LAPTOP CONNECTION CARD */}
      <View style={styles.connectionCard}>
        <View style={styles.connectionRow}>
          <View style={styles.connectionIconWrap}>
            <Ionicons
              name={status ? 'laptop-outline' : 'alert-circle-outline'}
              size={24}
              color={status ? colors.success : colors.warning}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectionTitle}>
              {status ? status.hostname : 'Laptop Bağlantısı Aranıyor'}
            </Text>
            <Text style={styles.connectionSub}>
              {status
                ? `Açık kalma: ${status.uptimeHours} saat • ${status.platform || 'Windows'}`
                : 'Bilgisayarınızın ve köprünün çalıştığından emin olun'}
            </Text>
          </View>
          <View style={[styles.pingBadge, status ? styles.pingBadgeGreen : styles.pingBadgeRed]}>
            <Text style={[styles.pingText, { color: status ? colors.success : colors.danger }]}>
              {status ? 'CANLI' : 'KOPUK'}
            </Text>
          </View>
        </View>
      </View>

      {/* LIVE METRICS (CPU / RAM / BATTERY) */}
      <View style={styles.metricsRow}>
        {/* CPU */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>CPU</Text>
            <Ionicons name="hardware-chip-outline" size={16} color={colors.primaryLight} />
          </View>
          <Text style={styles.metricValue}>{status ? `%${status.cpuPercent}` : '--'}</Text>
          <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${status?.cpuPercent || 0}%`, backgroundColor: colors.primaryLight }]} />
          </View>
        </View>

        {/* RAM */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>RAM</Text>
            <Ionicons name="speedometer-outline" size={16} color={colors.accent} />
          </View>
          <Text style={styles.metricValue}>{status ? `%${status.ramPercent}` : '--'}</Text>
          <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${status?.ramPercent || 0}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.metricSub}>{status ? `${status.ramUsedGB}/${status.ramTotalGB} GB` : ''}</Text>
        </View>

        {/* BATTERY */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>PİL</Text>
            <Ionicons
              name={status?.isCharging ? 'battery-charging-outline' : 'battery-full-outline'}
              size={16}
              color={colors.success}
            />
          </View>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {status ? `%${status.batteryPercent}` : '--'}
          </Text>
          <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${status?.batteryPercent || 0}%`, backgroundColor: colors.success }]} />
          </View>
          <Text style={styles.metricSub}>{status?.isCharging ? '⚡ Şarjda' : '🔋 Pilde'}</Text>
        </View>
      </View>

      {/* SCREEN MONITOR */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Canlı Laptop Ekranı</Text>
            <Text style={styles.cardSubtitle}>
              {screenshot ? `Son çekim: ${screenshot.time}` : 'Anlık masaüstü önizlemesi'}
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
              <>
                <Ionicons name="camera-outline" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.captureBtnText}>Ekranı Çek</Text>
              </>
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
            <Ionicons name="desktop-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyMonitorText}>
              Ekran görüntüsü almak için dokunun
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MEDIA & SYSTEM CONTROLS */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Hızlı Sistem Kontrolleri</Text>
        <Text style={styles.cardSubtitle}>Ses, medya ve masaüstü kısayolları</Text>

        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_down')}>
            <Ionicons name="volume-low-outline" size={22} color={colors.text} />
            <Text style={styles.deckLabel}>Ses Kıs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_mute')}>
            <Ionicons name="volume-mute-outline" size={22} color={colors.text} />
            <Text style={styles.deckLabel}>Sessiz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('volume_up')}>
            <Ionicons name="volume-high-outline" size={22} color={colors.text} />
            <Text style={styles.deckLabel}>Ses Aç</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridRow, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('media_play_pause')}>
            <Ionicons name="play-skip-back-circle-outline" size={22} color={colors.primaryLight} />
            <Text style={styles.deckLabel}>Oynat/Dur</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('media_next')}>
            <Ionicons name="play-skip-forward-circle-outline" size={22} color={colors.primaryLight} />
            <Text style={styles.deckLabel}>Sonraki</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deckBtn, styles.deckBtnDanger]}
            onPress={() => handleQuickAction('lock_pc')}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.danger} />
            <Text style={[styles.deckLabel, { color: colors.dangerLight }]}>PC Kilitle</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridRow, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('speak_text', 'Selam Omar, Namikaze AI emrinde!')}>
            <Ionicons name="megaphone-outline" size={22} color={colors.accent} />
            <Text style={styles.deckLabel}>Sesli Selam</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('show_notification', 'Namikaze AI telefonundan bağlandı!')}>
            <Ionicons name="notifications-outline" size={22} color={colors.cyan} />
            <Text style={styles.deckLabel}>Bildirim Gönder</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deckBtn} onPress={() => handleQuickAction('empty_recycle_bin')}>
            <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.deckLabel}>Çöp Boşalt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QUICK LAUNCH & WEB */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Laptopta Hızlı Başlat</Text>
        <Text style={styles.cardSubtitle}>Web adresi veya uygulama açın</Text>

        <View style={styles.urlRow}>
          <TextInput
            style={styles.urlInput}
            placeholder="Web sitesi (örn: youtube.com)..."
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
            { label: 'YouTube', icon: 'logo-youtube', color: '#EF4444', act: 'open_url', val: 'https://youtube.com' },
            { label: 'GitHub', icon: 'logo-github', color: '#CBD5E1', act: 'open_url', val: 'https://github.com' },
            { label: 'Hesap Mak.', icon: 'calculator-outline', color: '#38BDF8', act: 'launch_app', val: 'calc.exe' },
            { label: 'Not Defteri', icon: 'document-text-outline', color: '#FBBF24', act: 'launch_app', val: 'notepad.exe' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.launchChip}
              onPress={() => handleQuickAction(item.act, item.val)}
            >
              <Ionicons name={item.icon} size={15} color={item.color} style={{ marginRight: 6 }} />
              <Text style={styles.launchChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI COMMANDER CARD */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => onNavigate('chat')}
        activeOpacity={0.85}
      >
        <View style={styles.aiBannerIconWrap}>
          <Ionicons name="sparkles" size={24} color="#FFF" />
        </View>
        <View style={styles.aiBannerTextWrap}>
          <Text style={styles.aiBannerTitle}>Antigravity AI Komutanı</Text>
          <Text style={styles.aiBannerSubtitle}>
            Doğal dille komut verin veya PC görevlerini otomatize edin.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.primaryLight} />
      </TouchableOpacity>

      <View style={{ height: 24 }} />
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
    backgroundColor: colors.successSoft,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateIconWrap: {
    marginRight: 10,
  },
  updateTitle: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 14,
  },
  updateSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  toastBox: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
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
  statusPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillConnected: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  statusPillDisconnected: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  statusPillText: {
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  connectionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  connectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  pingBadgeGreen: {
    backgroundColor: colors.successSoft,
  },
  pingBadgeRed: {
    backgroundColor: colors.dangerSoft,
  },
  pingText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: 3,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  miniBarBg: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
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
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  captureBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
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
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMonitorText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  deckBtn: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: 3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  deckBtnDanger: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  deckLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  urlRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  urlInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  urlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
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
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
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
});
