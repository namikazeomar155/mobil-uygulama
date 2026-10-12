import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';

const MOOD_OPTIONS = [
  { emoji: '⚡', name: 'Enerjik' },
  { emoji: '✨', name: 'Harika' },
  { emoji: '🌿', name: 'Huzurlu' },
  { emoji: '🎯', name: 'Odaklı' },
  { emoji: '💭', name: 'Düşünceli' },
  { emoji: '☕', name: 'Yorgun' },
];

export default function JournalScreen() {
  const [entries, setEntries] = useState([]);
  const [selectedMood, setSelectedMood] = useState('✨ Harika');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const list = await storageService.getJournalEntries();
    setEntries(list);
  };

  const handleSave = async () => {
    if (!note.trim()) return;
    const updated = await storageService.addJournalEntry(selectedMood, note.trim());
    setEntries(updated);
    setNote('');
    Keyboard.dismiss();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Header subtitle="Zihin Günlüğü" title="Günlük & Notlar 📖" />

      {/* YENİ GÜNLÜK NOTU ALMA KARTI */}
      <View style={styles.inputCard}>
        <Text style={styles.cardHeader}>Bugünü Özetle</Text>

        <Text style={styles.label}>Ruh Halin:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
          {MOOD_OPTIONS.map((m) => {
            const val = `${m.emoji} ${m.name}`;
            const active = selectedMood === val;
            return (
              <TouchableOpacity
                key={m.name}
                style={[styles.moodChip, active && styles.moodChipActive]}
                onPress={() => setSelectedMood(val)}
              >
                <Text style={styles.moodChipEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodChipText, active && styles.moodChipTextActive]}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TextInput
          style={styles.textInput}
          placeholder="Bugün seni ne mutlu etti ya da neler öğrendin?..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[styles.saveButton, !note.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!note.trim()}
        >
          <Text style={styles.saveButtonText}>Günlüğü Kaydet ✍️</Text>
        </TouchableOpacity>
      </View>

      {/* GEÇMİŞ GÜNLÜKLER */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Geçmiş Notlar ({entries.length})</Text>

        {entries.map((item) => (
          <View key={item.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryMood}>{item.mood}</Text>
              <Text style={styles.entryDate}>{item.date}</Text>
            </View>
            <Text style={styles.entryText}>{item.note}</Text>
          </View>
        ))}
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
  inputCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  moodScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  moodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moodChipEmoji: {
    marginRight: 6,
    fontSize: 14,
  },
  moodChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  moodChipTextActive: {
    color: '#FFF',
  },
  textInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    marginTop: 26,
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryMood: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  entryDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  entryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
