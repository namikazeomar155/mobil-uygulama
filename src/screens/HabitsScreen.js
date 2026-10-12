import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { storageService } from '../services/storageService';

const CATEGORIES = ['Sağlık', 'Gelişim', 'Zihin', 'Üretkenlik', 'Genel'];

export default function HabitsScreen() {
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Genel');

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    const list = await storageService.getHabits();
    setHabits(list);
  };

  const handleToggle = async (id) => {
    const updated = await storageService.toggleHabit(id);
    setHabits(updated);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const updated = await storageService.addHabit(newTitle.trim(), newCategory);
    setHabits(updated);
    setNewTitle('');
    setModalVisible(false);
  };

  const handleDelete = async (id, title) => {
    const updated = await storageService.deleteHabit(id);
    setHabits(updated);
  };

  return (
    <View style={styles.container}>
      <Header
        subtitle="Günlük Disiplin"
        title="Alışkanlıklar 🎯"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Yeni</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {habits.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Henüz alışkanlık eklenmedi</Text>
            <Text style={styles.emptySubtitle}>
              Gelişmek istediğin bir alanı seç ve ilk alışkanlığını oluştur!
            </Text>
          </View>
        ) : (
          habits.map((h) => (
            <View
              key={h.id}
              style={[styles.card, h.completedToday && styles.cardCompleted]}
            >
              <TouchableOpacity
                style={styles.checkArea}
                onPress={() => handleToggle(h.id)}
              >
                <View style={[styles.checkbox, h.completedToday && styles.checkboxChecked]}>
                  {h.completedToday && <Text style={styles.checkIcon}>✓</Text>}
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.title, h.completedToday && styles.titleDone]}>
                    {h.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.categoryBadge}>{h.category}</Text>
                    <Text style={styles.streakText}>🔥 {h.streak} Gün Serisi</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(h.id, h.title)}
              >
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* YENİ ALIŞKANLIK EKLEME MODALI */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Alışkanlık Oluştur</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Örn: 30 Dk İngilizce Çalış 🇬🇧"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <Text style={styles.modalSubtitle}>Kategori Seçin:</Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    newCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      newCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !newTitle.trim() && styles.saveBtnDisabled]}
                onPress={handleAdd}
                disabled={!newTitle.trim()}
              >
                <Text style={styles.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardCompleted: {
    borderColor: colors.surfaceLight,
    opacity: 0.75,
  },
  checkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
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
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: 10,
    fontWeight: '600',
  },
  streakText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    color: colors.textMuted,
    fontSize: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  catChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
