import { storageService } from './storageService';
import { LOCAL_CONFIG } from '../config.local';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

export const aiService = {
  /**
   * Gemini 3.8 Flash API ile sohbet yanıtı üretir.
   */
  async sendMessage(userMessage, conversationHistory = []) {
    const settings = await storageService.getSettings();
    let apiKey = settings.geminiApiKey;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      apiKey = LOCAL_CONFIG?.GEMINI_API_KEY || '';
    }

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      return this.getMockResponse(userMessage);
    }

    try {
      // Gemini API formatına uygun geçmiş mesajlar (welcome mesajını hariç tutarak user ile başlat)
      const validHistory = conversationHistory
        .filter(msg => msg.id !== 'welcome')
        .slice(-6)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      validHistory.push({
        role: 'user',
        parts: [{
          text: `Sen "Aura" adında samimi, motive edici, empatik ve zeki bir Türkçe kişisel yaşam ve alışkanlık koçusun. Kullanıcıya kısa, net, içten ve faydalı tavsiyeler ver. Kullanıcı mesajı: ${userMessage}`
        }]
      });

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: validHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Gemini API Error:', errorData);
        return `⚠️ API Hatası (${response.status}): ${errorData?.error?.message || 'Lütfen Ayarlar sekmesindeki API anahtarınızı kontrol edin.'}`;
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply || 'Düşüncelerimi toparlarken bir an duraksadım. Lütfen tekrar sor!';
    } catch (error) {
      console.error('aiService error:', error);
      return `⚠️ Bağlantı hatası: ${error.message}`;
    }
  },

  /**
   * API anahtarı henüz girilmemişken çalışan akıllı yerel simülatör
   */
  getMockResponse(message) {
    const lower = message.toLowerCase();
    if (lower.includes('merhaba') || lower.includes('selam')) {
      return 'Selam! Harika bir gün geçirmeni dilerim. Bugün hangi alışkanlığını tamamlamak istiyorsun?';
    }
    return `Harika bir düşünce! 🌟 (Ayarlar sekmesinden API anahtarınızı kontrol edebilirsiniz.)`;
  }
};
