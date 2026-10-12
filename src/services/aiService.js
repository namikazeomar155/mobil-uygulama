import { storageService } from './storageService';
import { LOCAL_CONFIG } from '../config.local';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const aiService = {
  /**
   * Gemini API ile sohbet yanıtı üretir.
   */
  async sendMessage(userMessage, conversationHistory = []) {
    const settings = await storageService.getSettings();
    let apiKey = settings.geminiApiKey || LOCAL_CONFIG?.GEMINI_API_KEY || '';

    // Anahtar geçerli bir anahtar değilse veya yer tutucuysa akıllı simülasyon yanıtı ver
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      return this.getMockResponse(userMessage);
    }

    try {
      // Gemini API için içerik geçmişini hazırla
      const contents = conversationHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Yeni kullanıcı mesajını ekle
      contents.push({
        role: 'user',
        parts: [{
          text: `Sen "Aura" adında samimi, motive edici, empatik ve zeki bir Türkçe kişisel yaşam ve alışkanlık koçusun. Kullanıcıya kısa, net, içten ve faydalı tavsiyeler ver. Kullanıcı mesajı: ${userMessage}`
        }]
      });

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Gemini API Error:', errorData);
        return `⚠️ API Yanıtı Alınamadı (${response.status}). Lütfen Ayarlar sekmesindeki API anahtarınızı kontrol edin. Demo yanıt: Günün hedeflerine odaklanmak her zaman harika bir adımdır!`;
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply || 'Düşüncelerimi toparlarken bir an duraksadım. Lütfen tekrar sor!';
    } catch (error) {
      console.error('aiService error:', error);
      return this.getMockResponse(userMessage);
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
    if (lower.includes('su') || lower.includes('sağlık')) {
      return 'Vücudunu susuz bırakmamak odaklanmanı doğrudan artırır! Hemen bir bardak su içip alışkanlık listenden işaretlemeyi unutma 💧';
    }
    if (lower.includes('kitap') || lower.includes('okuma')) {
      return 'Günde sadece 20 sayfa kitap okumak yılda 25-30 kitaba denk gelir! Zihnini beslemek için harika bir yatırım 📖';
    }
    if (lower.includes('stres') || lower.includes('yorgun')) {
      return 'Bazen derin bir nefes alıp 5 dakika gözlerini kapatmak her şeyi sıfırlar. Kendine çok yüklenme, dinlenmek de üretkenliğin bir parçasıdır 🌿';
    }
    if (lower.includes('hedef') || lower.includes('plan')) {
      return 'Bugün en önemli 3 önceliğini belirle ve ilk önce en zor olandan başla. Gün sonunda hissettiğin rahatlama paha biçilemez olacak! 🎯';
    }

    return `Harika bir düşünce! 🌟\n\n(Not: Canlı yapay zeka ile sınırsız sohbet etmek için Ayarlar sekmesinden ücretsiz Google Gemini API anahtarını ekleyebilirsin.)`;
  }
};
