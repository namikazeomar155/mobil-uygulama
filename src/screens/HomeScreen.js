import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';

const MOODS = [
  { emoji: '⚡', label: 'Enerjik' },
  { emoji: '✨', label: 'Harika' },
  { emoji: '🌿', label: 'Sakin' },
  { emoji: '☕', label: 'Yorgun' },
  { emoji: '🎯', label: 'Odaklı' },
];

export default function HomeScreen({ onNavigate }) {
  const [habits, setHabits] = useState([]);
  const [selectedMood, setSelectedMood] = useState('✨');
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({ userName: 'Kullanıcı' });

  const loadData = async () => {
    const loadedHabits = await storageService.getHabits();
    const loadedSettings = await storageService.getSettings();
    setHabits(loadedHabits);
    setSettings(loadedSettings);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleHabit = async (id) => {
    const updated = await storageService.toggleHabit(id);
    setHabits(updated);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'Tünaydın';
    return 'İyi Akşamlar';
  };

  const completedCount = habits.filter(h => h.completedToday).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Header
        subtitle={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${getGreeting()}, ${settings.userName || 'Dostum'} 👋`}
      />

      {/* GÜNLÜK İLERLEME KARTI */}
      <View style={styles.cardHighlight}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Bugünkü İlerlemen</Text>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>%{progressPercent}</Text>
          </View>
        </View>

        <Text style={styles.cardSub}>
          {completedCount} / {habits.length} alışkanlık tamamlandı
        </Text>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* RUH HALİ SEÇİCİ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bugün Nasıl Hissediyorsun?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m.label}
              style={[
                styles.moodButton,
                selectedMood === m.emoji && styles.moodButtonActive,
              ]}
              onPress={() => setSelectedMood(m.emoji)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[
                styles.moodLabel,
                selectedMood === m.emoji && styles.moodLabelActive,
              ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* HIZLI ALIŞKANLIKLAR LİSTESİ */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Günün Alışkanlıkları</Text>
          <TouchableOpacity onPress={() => onNavigate('habits')}>
            <Text style={styles.linkText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {habits.slice(0, 3).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.habitRow, item.completedToday && styles.habitRowCompleted]}
            onPress={() => handleToggleHabit(item.id)}
          >
            <View style={[styles.checkbox, item.completedToday && styles.checkboxChecked]}>
              {item.completedToday && <Text style={styles.checkIcon}>✓</Text>}
            </View>
            <View style={styles.habitTextWrap}>
              <Text style={[styles.habitTitle, item.completedToday && styles.habitTitleDone]}>
                {item.title}
              </Text>
              <Text style={styles.habitMeta}>
                🔥 {item.streak} Gün Serisi • {item.category}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI KOÇ ÖNERİSİ KARTI */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => onNavigate('chat')}
      >
        <View style={styles.aiBannerIconWrap}>
          <Text style={styles.aiBannerIcon}>🤖</Text>
        </View>
        <View style={styles.aiBannerTextWrap}>
          <Text style={styles.aiBannerTitle}>Aura AI Asistanına Danış</Text>
          <Text style={styles.aiBannerSubtitle}>
            Bugünkü planlarını netleştirmek ve motivasyon almak için dokun.
          </Text>
        </View>
        <Text style={styles.aiBannerArrow}>→</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
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
  cardHighlight: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  percentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  section: {
    marginTop: 26,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  linkText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minWidth: 60,
  },
  moodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  moodLabelActive: {
    color: colors.primaryLight,
  },
  habitRow: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  habitRowCompleted: {
    opacity: 0.7,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkIcon: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  habitTextWrap: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  habitMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiBanner: {
    marginHorizontal: 20,
    marginTop: 24,
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
