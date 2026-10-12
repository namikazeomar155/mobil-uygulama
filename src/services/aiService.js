import { storageService } from './storageService';
import { bridgeService } from './bridgeService';
import { APP_CONFIG } from '../config';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

export const aiService = {
  /**
   * Gemini 3.8 Flash + Canlı Laptop Köprüsü (JARVIS Modu)
   */
  async sendMessage(userMessage, conversationHistory = []) {
    const settings = await storageService.getSettings();
    let apiKey = settings.geminiApiKey;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      apiKey = APP_CONFIG?.GEMINI_API_KEY || '';
    }

    if (!apiKey || apiKey.trim() === '') {
      return '⚠️ API anahtarı bulunamadı. Lütfen Ayarlar sekmesini kontrol edin.';
    }

    try {
      const validHistory = conversationHistory
        .filter(msg => msg.id !== 'welcome')
        .slice(-6)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      const systemPrompt = `Sen kullanıcının Windows 10/11 bilgisayarına (DESKTOP-3EQ1SQ5) doğrudan bağlı olan "Nexus / Antigravity Komutanı" adında yetenekli bir yapay zeka asistanısın.
Eğer kullanıcının isteği bilgisayarda bir işlem yapmayı, bilgi sorgulamayı, dosya/klasör oluşturmayı, uygulama açmayı/kapatmayı veya sistem kontrolünü gerektiriyorsa:
1. Yanıtında ne yaptığını Türkçe olarak kısaca açıkla.
2. Çalıştırılacak Windows PowerShell komutunu tam olarak <PS>komut</PS> etiketleri arasına yaz (Örn: <PS>Get-ChildItem "$HOME\\Desktop" | Select-Object -ExpandProperty Name</PS>).
3. Eğer kullanıcı büyük bir yazılım/kodlama projesi yapılmasını ve Antigravity ajanına devredilmesini istiyorsa <AG>görev açıklaması</AG> etiketleri arasına yaz.
Sadece sohbet ediyorsa etiket kullanmadan doğrudan samimi ve net Türkçe cevap ver.`;

      validHistory.push({
        role: 'user',
        parts: [{
          text: `${systemPrompt}\n\nKullanıcı komutu: ${userMessage}`
        }]
      });

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: validHistory,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 700,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return `⚠️ API Hatası (${response.status}): ${errorData?.error?.message || 'Bağlantı kontrol edilmeli.'}`;
      }

      const data = await response.json();
      let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Komut anlaşıldı.';

      // <PS>...</PS> etiketi varsa Laptopta canlı çalıştır!
      const psMatch = reply.match(/<PS>([\s\S]*?)<\/PS>/i);
      if (psMatch && psMatch[1]) {
        const psCommand = psMatch[1].trim();
        const cleanReply = reply.replace(/<PS>[\s\S]*?<\/PS>/gi, '').trim();
        const execRes = await bridgeService.execPowerShell(psCommand);
        const outputText = execRes.output || execRes.error || 'Komut başarıyla tamamlandı (Çıktı yok).';
        return `${cleanReply}\n\n💻 **Laptop Çıktısı (${psCommand}):**\n\`\`\`\n${outputText.slice(0, 1200)}\n\`\`\``;
      }

      // <AG>...</AG> etiketi varsa Antigravity kuyruğuna gönder!
      const agMatch = reply.match(/<AG>([\s\S]*?)<\/AG>/i);
      if (agMatch && agMatch[1]) {
        const agTask = agMatch[1].trim();
        const cleanReply = reply.replace(/<AG>[\s\S]*?<\/AG>/gi, '').trim();
        const qRes = await bridgeService.sendAction('antigravity_task', agTask);
        return `${cleanReply}\n\n🚀 ${qRes.output || 'Görev Antigravity kuyruğuna iletildi.'}`;
      }

      return reply;
    } catch (error) {
      return `⚠️ Bağlantı hatası: ${error.message}`;
    }
  },
};
