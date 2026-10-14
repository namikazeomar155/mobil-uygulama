import { storageService } from './storageService';
import { bridgeService } from './bridgeService';
import { APP_CONFIG } from '../config';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const LAPTOP_TOOLS = [
  {
    function_declarations: [
      {
        name: 'run_powershell',
        description: 'Kullanıcının Windows 10/11 laptopunda (DESKTOP-3EQ1SQ5) PowerShell komutu çalıştırır ve çıktısını getirir. Dosya sorgulama, sistem bilgisi, ağ durumu, disk durumu, işlem kontrolü vb. tüm işlemler için kullanılır.',
        parameters: {
          type: 'OBJECT',
          properties: {
            command: {
              type: 'STRING',
              description: 'Laptopta çalıştırılacak tam PowerShell komutu (örn: Get-Process | Sort-Object CPU -Descending | Select-Object -First 5)',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'system_control',
        description: 'Laptop donanım ve sistem kontrollerini gerçekleştirir (ses aç/kıs/sessiz, medya oynat/durdur/sonraki/önceki, PC kilitle, uyku modu, çöp kutusu temizleme).',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: {
              type: 'STRING',
              description: 'Aksiyon türü',
              enum: [
                'volume_up',
                'volume_down',
                'volume_mute',
                'media_play_pause',
                'media_next',
                'media_prev',
                'lock_pc',
                'sleep_pc',
                'empty_recycle_bin',
              ],
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'open_website',
        description: 'Laptopun varsayılan tarayıcısında (Chrome/Edge) bir internet sitesi veya URL açar.',
        parameters: {
          type: 'OBJECT',
          properties: {
            url: { type: 'STRING', description: 'Açılacak web adresi (örn: https://youtube.com, google.com)' },
          },
          required: ['url'],
        },
      },
      {
        name: 'launch_application',
        description: 'Laptopta bir program, oyun veya uygulama başlatır.',
        parameters: {
          type: 'OBJECT',
          properties: {
            appName: { type: 'STRING', description: 'Uygulama veya komut adı (örn: notepad, calc, chrome, code, spotify)' },
          },
          required: ['appName'],
        },
      },
      {
        name: 'speak_on_laptop',
        description: 'Laptop hoparlöründen Türkçe sesli konuşma yapar (Text-to-Speech). Kullanıcı laptopun bir şey söylemesini istediğinde kullanılır.',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING', description: 'Laptopun sesli olarak söyleyeceği metin' },
          },
          required: ['text'],
        },
      },
      {
        name: 'show_laptop_notification',
        description: 'Laptop ekranının sağ altında açılır pencere (Windows bildirim kutusu) gösterir.',
        parameters: {
          type: 'OBJECT',
          properties: {
            message: { type: 'STRING', description: 'Laptop ekranında belirecek bildirim mesajı' },
          },
          required: ['message'],
        },
      },
      {
        name: 'clipboard_action',
        description: 'Laptop panosunu okur veya laptop panosuna metin kopyalar.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['get', 'set'] },
            text: { type: 'STRING', description: 'set işlemi için kopyalanacak metin' },
          },
          required: ['action'],
        },
      },
      {
        name: 'search_files',
        description: 'Laptopta Masaüstü, İndirilenler ve Belgeler içinde dosya arar.',
        parameters: {
          type: 'OBJECT',
          properties: {
            keyword: { type: 'STRING', description: 'Aranacak dosya adı veya uzantısı (örn: .pdf, rapor, omar)' },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'take_screenshot',
        description: 'Laptop ekranının o anki canlı görüntüsünü çeker.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'delegate_antigravity',
        description: 'Büyük kodlama, yazılım geliştirme veya derin proje görevlerini laptoptaki Antigravity AI ajanına kuyruk görevi olarak devreder.',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskPrompt: { type: 'STRING', description: 'Antigravity ajanına iletilecek detaylı görev açıklaması' },
          },
          required: ['taskPrompt'],
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `Sen kullanıcının Windows 10/11 laptopuna (DESKTOP-3EQ1SQ5) doğrudan ve kesintisiz bağlı olan "Namikaze AI" adında kişisel yapay zeka komutanısın.

KRİTİK ÇALIŞMA KURALLARI:
1. KULLANICIYA KESİNLİKLE "Şu kodu terminalde çalıştırın", "PowerShell'e şunu yazabilirsiniz" GİBİ CEVAPLAR VERME! Kullanıcı kodu kendisi çalıştırmak için değil, senin laptopta doğrudan uygulaman için burada.
2. Bilgisayarda bir işlem yapılması (dosya bulma, ses açma, site açma, sistem bilgisi öğrenme, ekran görüntüsü, konuşma, uygulama açma) istendiğinde KESİNLİKLE ilgili fonksiyonu (tool) çağır.
3. Bir fonksiyon çağırdığında laptop onu anında çalıştıracaktır.
4. Sadece genel sohbet, bilgi veya tavsiye istendiğinde samimi, havalı ve yardımsever bir dille Türkçe yanıt ver.`;

export const aiService = {
  /**
   * Gemini 3.8 Flash + Native Function Calling + Resilient Fallback Auto-Exec
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
      const contents = conversationHistory
        .filter(msg => msg.id !== 'welcome')
        .slice(-8)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      contents.push({
        role: 'user',
        parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nKullanıcı komutu: ${userMessage}` }]
      });

      // 1. AŞAMA: Gemini API'ye Tools ile Birlikte İstek Gönder
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools: LAPTOP_TOOLS,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return `⚠️ API Hatası (${response.status}): ${errorData?.error?.message || 'Bağlantı kontrol edilmeli.'}`;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // A) NATIVE FUNCTION CALLING TETİKLENDİ Mİ?
      const funcCallPart = parts.find(p => p.functionCall);
      if (funcCallPart && funcCallPart.functionCall) {
        const { name, args } = funcCallPart.functionCall;
        return await this.executeFunctionCall(name, args || {});
      }

      // B) EĞER MODEL FUNCTION CALL KULLANMAYIP METİN İÇİNE KOD YAZDIYSA (FALLBACK)
      const rawText = parts.map(p => p.text || '').join('').trim();
      const codeToRun = this.extractCodeFromText(rawText);

      if (codeToRun) {
        // Kullanıcıya kodu göstermek YERİNE doğrudan laptopta çalıştır!
        const execRes = await bridgeService.execPowerShell(codeToRun);
        const output = execRes.output || execRes.error || 'İşlem tamamlandı.';
        const cleanExplanation = rawText
          .replace(/```[\s\S]*?```/g, '')
          .replace(/<PS>[\s\S]*?<\/PS>/gi, '')
          .trim();

        return `${cleanExplanation ? `${cleanExplanation}\n\n` : ''}⚡ **Laptopta Doğrudan Çalıştırıldı:**\n\`\`\`powershell\n${codeToRun}\n\`\`\`\n\n💻 **Sonuç:**\n\`\`\`\n${output.slice(0, 1000)}\n\`\`\``;
      }

      return rawText || 'Komut anlaşıldı.';
    } catch (error) {
      return `⚠️ Bağlantı hatası: ${error.message}`;
    }
  },

  /**
   * Gemini Fonksiyonunu Laptoptaki Köprü Üzerinden Çalıştırır
   */
  async executeFunctionCall(name, args) {
    try {
      switch (name) {
        case 'run_powershell': {
          const res = await bridgeService.execPowerShell(args.command);
          const out = res.output || res.error || 'Komut başarıyla tamamlandı (Çıktı yok).';
          return `⚡ **PowerShell Komutu Çalıştırıldı:**\n\`${args.command}\`\n\n💻 **Laptop Çıktısı:**\n\`\`\`\n${out.slice(0, 1200)}\n\`\`\``;
        }

        case 'system_control': {
          const res = await bridgeService.sendAction(args.action);
          return res.output || res.error || `✅ ${args.action} işlemi uygulandı.`;
        }

        case 'open_website': {
          const res = await bridgeService.sendAction('open_url', args.url);
          return res.output || `🌐 ${args.url} laptopta açıldı.`;
        }

        case 'launch_application': {
          const res = await bridgeService.sendAction('launch_app', args.appName);
          return res.output || `🚀 ${args.appName} laptopta başlatıldı.`;
        }

        case 'speak_on_laptop': {
          const res = await bridgeService.sendAction('speak_text', args.text);
          return res.output || `🗣️ Laptopta seslendirildi: "${args.text}"`;
        }

        case 'show_laptop_notification': {
          const res = await bridgeService.sendAction('show_notification', args.message);
          return res.output || `🔔 Bildirim laptop ekranında gösterildi.`;
        }

        case 'clipboard_action': {
          if (args.action === 'set') {
            const res = await bridgeService.sendAction('set_clipboard', args.text || '');
            return res.output || `📋 Metin panoya kopyalandı.`;
          } else {
            const res = await bridgeService.sendAction('get_clipboard');
            return `📋 **Laptop Panosundaki Metin:**\n${res.output || '(Pano boş)'}`;
          }
        }

        case 'search_files': {
          const res = await bridgeService.sendAction('search_files', args.keyword);
          return `🔍 **Dosya Arama Sonuçları ("${args.keyword}"):**\n\`\`\`\n${res.output || 'Dosya bulunamadı.'}\n\`\`\``;
        }

        case 'take_screenshot': {
          const res = await bridgeService.getScreenshot();
          if (res && res.ok && res.image) {
            return `📸 **Laptop Ekran Görüntüsü Alındı:** (${res.timestamp})\nEkran görüntüsü Ana Ekrandaki canlı monitöre de aktarıldı.`;
          }
          return `⚠️ Ekran görüntüsü alınamadı: ${res?.error || 'Bağlantı hatası'}`;
        }

        case 'delegate_antigravity': {
          const res = await bridgeService.sendAction('antigravity_task', args.taskPrompt);
          return res.output || `🚀 Görev Antigravity kuyruğuna iletildi: "${args.taskPrompt}"`;
        }

        default:
          return `⚠️ Bilinmeyen fonksiyon: ${name}`;
      }
    } catch (e) {
      return `❌ Komut laptopta çalıştırılırken hata oluştu: ${e.message}`;
    }
  },

  /**
   * Metin içinde gizlenmiş PowerShell kodlarını akıllıca ayıklar
   */
  extractCodeFromText(text) {
    if (!text) return null;

    // 1. <PS>...</PS> etiketi
    const psTag = text.match(/<PS>([\s\S]*?)<\/PS>/i);
    if (psTag && psTag[1]) {
      return psTag[1].replace(/```powershell|```ps1|```cmd|```/gi, '').trim();
    }

    // 2. ```powershell ... ``` veya ```ps1 ... ```
    const codeBlock = text.match(/```(?:powershell|ps1|cmd|batch)?\s*([\s\S]*?)```/i);
    if (codeBlock && codeBlock[1]) {
      const candidate = codeBlock[1].trim();
      // Eğer kod bloğu gerçekten bir komut içeriyorsa
      if (candidate.length > 2 && !candidate.startsWith('//') && !candidate.startsWith('#!/bin/bash')) {
        return candidate;
      }
    }

    return null;
  },
};
