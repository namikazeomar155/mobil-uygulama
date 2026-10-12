import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config';

const STORAGE_KEYS = {
  SETTINGS: '@nexus_settings_v2',
  CHAT_HISTORY: '@nexus_chat_v2',
};

export const storageService = {
  // --- AYARLAR & KÖPRÜ YAPILANDIRMASI ---
  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE' || parsed.geminiApiKey === APP_CONFIG?.GEMINI_API_KEY) {
          parsed.geminiApiKey = '';
        }
        return parsed;
      }
      return {
        geminiApiKey: '',
        customBridgeUrl: '',
        userName: 'Omar',
        isDarkMode: true,
      };
    } catch (e) {
      return { geminiApiKey: '', customBridgeUrl: '', userName: 'Omar', isDarkMode: true };
    }
  },

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('saveSettings error:', e);
    }
  },

  // --- KOMUTAN SOHBET GEÇMİŞİ ---
  async getChatHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (data) return JSON.parse(data);
      return [
        {
          id: 'welcome',
          sender: 'ai',
          text: '⚡ Nexus PC & Antigravity Komutanı hazır, Omar!\n\nBana doğrudan Türkçe komut verebilirsin:\n• "Masaüstündeki dosyaları listele"\n• "Bilgisayarın sesini aç"\n• "Laptopta YouTube aç"\n• "RAM\'i en çok kullanan 5 programı göster"',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        }
      ];
    } catch (e) {
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
