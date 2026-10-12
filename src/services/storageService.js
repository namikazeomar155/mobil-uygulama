import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  HABITS: '@aura_habits',
  JOURNAL: '@aura_journal',
  SETTINGS: '@aura_settings',
  CHAT_HISTORY: '@aura_chat',
};

const DEFAULT_HABITS = [
  { id: '1', title: 'Günde 2 Litre Su İç 💧', category: 'Sağlık', streak: 4, completedToday: true },
  { id: '2', title: '20 Sayfa Kitap Oku 📖', category: 'Gelişim', streak: 7, completedToday: false },
  { id: '3', title: '15 Dk Meditasyon / Yürüyüş 🧘', category: 'Zihin', streak: 2, completedToday: false },
  { id: '4', title: 'Günün Hedeflerini Belirle 🎯', category: 'Üretkenlik', streak: 12, completedToday: true },
];

export const storageService = {
  // --- ALIŞKANLIKLAR (HABITS) ---
  async getHabits() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
      if (data) return JSON.parse(data);
      // İlk açılışta varsayılan alışkanlıkları kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(DEFAULT_HABITS));
      return DEFAULT_HABITS;
    } catch (e) {
      console.error('getHabits error:', e);
      return DEFAULT_HABITS;
    }
  },

  async saveHabits(habits) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (e) {
      console.error('saveHabits error:', e);
    }
  },

  async toggleHabit(habitId) {
    try {
      const habits = await this.getHabits();
      const updated = habits.map(h => {
        if (h.id === habitId) {
          const completed = !h.completedToday;
          return {
            ...h,
            completedToday: completed,
            streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1)
          };
        }
        return h;
      });
      await this.saveHabits(updated);
      return updated;
    } catch (e) {
      console.error('toggleHabit error:', e);
      return [];
    }
  },

  async addHabit(title, category = 'Genel') {
    try {
      const habits = await this.getHabits();
      const newHabit = {
        id: Date.now().toString(),
        title,
        category,
        streak: 0,
        completedToday: false,
      };
      const updated = [newHabit, ...habits];
      await this.saveHabits(updated);
      return updated;
    } catch (e) {
      console.error('addHabit error:', e);
      return [];
    }
  },

  async deleteHabit(habitId) {
    try {
      const habits = await this.getHabits();
      const updated = habits.filter(h => h.id !== habitId);
      await this.saveHabits(updated);
      return updated;
    } catch (e) {
      console.error('deleteHabit error:', e);
      return [];
    }
  },

  // --- GÜNLÜK & RUH HALİ (JOURNAL) ---
  async getJournalEntries() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL);
      if (data) return JSON.parse(data);
      return [
        {
          id: '1',
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          mood: 'Enerjik ⚡',
          note: 'Yeni mobil uygulamamızı geliştirmeye başladık! Her şey harika ilerliyor.',
        }
      ];
    } catch (e) {
      console.error('getJournalEntries error:', e);
      return [];
    }
  },

  async addJournalEntry(mood, note) {
    try {
      const entries = await this.getJournalEntries();
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        mood,
        note,
      };
      const updated = [newEntry, ...entries];
      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('addJournalEntry error:', e);
      return [];
    }
  },

  // --- AYARLAR & API KEYS ---
  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return JSON.parse(data);
      return {
        geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
        userName: process.env.EXPO_PUBLIC_DEFAULT_USER || 'Kullanıcı',
        isDarkMode: true,
      };
    } catch (e) {
      console.error('getSettings error:', e);
      return { geminiApiKey: '', userName: 'Kullanıcı', isDarkMode: true };
    }
  },

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('saveSettings error:', e);
    }
  },

  // --- SOHBET GEÇMİŞİ (CHAT) ---
  async getChatHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (data) return JSON.parse(data);
      return [
        {
          id: 'welcome',
          sender: 'ai',
          text: 'Merhaba! Ben Aura, kişisel yapay zeka asistanın ve yaşam koçunum. Bugün zihnini meşgul eden bir konu var mı veya gününü planlamama yardımcı olmamı ister misin?',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        }
      ];
    } catch (e) {
      console.error('getChatHistory error:', e);
      return [];
    }
  },

  async saveChatHistory(history) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('saveChatHistory error:', e);
    }
  }
};
