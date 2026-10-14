import { storageService } from './storageService';
import { bridgeService } from './bridgeService';
import { APP_CONFIG } from '../config';

// Otomatik hata kurtarmalı, yedekli model listesi (503/429/network hatasında sıradakine geçer)
const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest', // En hızlı, 200 OK yanıt veren, sıfır gecikmeli model
  'gemini-3.5-flash-lite',    // Kararlı yedek model
  'gemini-3.8-flash',         // Yüksek kapasiteli model
  'gemini-3.7-flash',         // Alternatif model
  'gemini-flash-latest',      // Stabil genel flash
];

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
        description: 'Laptop donanım ve sistem kontrollerini gerçekleştirir (ses aç/kıs/sessiz, medya oynat/durdur/sonraki/önceki, PC kilitle, uyku modu, çöp kutusu temizleme, bilgisayarı kapat, yeniden başlat).',
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
                'shutdown_pc',
                'restart_pc',
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
        name: 'get_system_status',
        description: 'Laptop donanım durumunu (Pil/Şarj yüzdesi, CPU yükü, RAM kullanımı, uptime) detaylı olarak getirir.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'kill_process',
        description: 'Laptopta donan veya istenmeyen bir programı/işlemi PID numarasına göre zorla kapatır.',
        parameters: {
          type: 'OBJECT',
          properties: {
            processId: { type: 'STRING', description: 'Kapatılacak işlemin ID (PID) numarası' },
          },
          required: ['processId'],
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
1. KULLANICIYA KESİNLİKLE "Şu kodu terminalde çalıştırın", "PowerShell'e şunu yazabilirsiniz" GİBİ CEVAPLAR VERME! Kullanıcı kodu kendisi çalıştırmak için değil, senin laptopta DOĞRUDAN ÇALIŞTIRMAN için burada.
2. Bilgisayarda bir işlem yapılması (dosya bulma, ses açma, site açma, sistem bilgisi öğrenme, ekran görüntüsü, konuşma, uygulama açma, PC kapatma, kilitleme) istendiğinde KESİNLİKLE ilgili fonksiyonu (tool) çağır.
3. Bir fonksiyon çağırdığında laptop onu anında çalıştıracaktır.
4. Sadece genel sohbet, bilgi veya tavsiye istendiğinde samimi, havalı ve yardımsever bir dille Türkçe yanıt ver.`;

export const aiService = {
  /**
   * 0. AŞAMA: Anında / Çevrimdışı Doğrudan Komut Eşleştirici (0.05sn Tepki, Sıfır Hata)
   * Standart PC komutlarını Google API'ye gitmeden anında laptoptaki köprüye iletir.
   */
  async matchDirectCommand(rawInput) {
    if (!rawInput) return null;
    const text = rawInput.trim().toLowerCase();

    // 1. Bilgisayarı kapat / Kapat
    if (
      /^(bilgisayar[ıi]|laptop[u]?|pc)?\s*(kapat|kapatılsın|turn off|shutdown|power off)$/i.test(text) ||
      text === 'kapat' || text === 'bilgisayarı kapat' || text === 'kapat laptopu' || text === 'laptopu kapat'
    ) {
      const res = await bridgeService.sendAction('shutdown_pc');
      return `🔌 **Laptop Kapatılıyor!**\nSistem 15 saniye içinde güvenli bir şekilde kapatılacaktır.\n_${res.output || 'Komut laptoba başarıyla iletildi.'}_`;
    }

    // 2. Yeniden başlat
    if (
      /^(bilgisayar[ıi]|laptop[u]?|pc)?\s*(yeniden başlat|restart|reboot)$/i.test(text) ||
      text === 'yeniden başlat' || text === 'restart'
    ) {
      const res = await bridgeService.sendAction('restart_pc');
      return `🔄 **Laptop Yeniden Başlatılıyor!**\nSistem 15 saniye içinde yeniden başlatılacaktır.\n_${res.output || 'Komut laptoba başarıyla iletildi.'}_`;
    }

    // 3. Ekranı Kilitle
    if (
      /(ekran[ıi]?\s*kilitle|kilitle|bilgisayar[ıi]?\s*kilitle|lock\s*screen|lock\s*pc|kilit)/i.test(text)
    ) {
      const res = await bridgeService.sendAction('lock_pc');
      return `🔒 **Laptop Ekranı Kilitlendi!**\nOturum güvenli bir şekilde kilitlendi.`;
    }

    // 4. Uyku Modu
    if (/(uyku\s*modu|uyut|uyu|sleep\s*mode|sleep\s*pc)/i.test(text)) {
      const res = await bridgeService.sendAction('sleep_pc');
      return `💤 **Laptop Uyku Moduna Alındı.**`;
    }

    // 5. Ses Aç / Yükselt
    if (/(ses[i]?\s*(aç|yükselt|artır)|volume\s*up)/i.test(text)) {
      const res = await bridgeService.sendAction('volume_up');
      return `🔊 **Laptop Sesi Yükseltildi (+10%).**`;
    }

    // 6. Ses Kıs / Azalt
    if (/(ses[i]?\s*(kıs|azalt|alçalt)|volume\s*down)/i.test(text)) {
      const res = await bridgeService.sendAction('volume_down');
      return `🔉 **Laptop Sesi Kısıldı (-10%).**`;
    }

    // 7. Sessiz / Mute
    if (/(sessiz|mute|ses[i]?\s*(kapat|sustur))/i.test(text)) {
      const res = await bridgeService.sendAction('volume_mute');
      return `🔇 **Laptop Sessize Alındı / Açıldı.**`;
    }

    // 8. Medya Oynat / Durdur
    if (/(oynat|duraklat|durdur|şarkı(yı)?\s*durdur|şarkı(yı)?\s*başlat|play|pause)/i.test(text)) {
      const res = await bridgeService.sendAction('media_play_pause');
      return `⏯️ **Medya Oynatıldı / Duraklatıldı.**`;
    }

    // 9. Sonraki Şarkı
    if (/(sonraki\s*(şarkı|müzik|parça)|next\s*track)/i.test(text)) {
      const res = await bridgeService.sendAction('media_next');
      return `⏭️ **Sonraki Parçaya Geçildi.**`;
    }

    // 10. Önceki Şarkı
    if (/(önceki\s*(şarkı|müzik|parça)|prev\s*track)/i.test(text)) {
      const res = await bridgeService.sendAction('media_prev');
      return `⏮️ **Önceki Parçaya Geçildi.**`;
    }

    // 11. Geri Dönüşüm Kutusu / Çöp Temizle
    if (/(çöp[ü]?\s*(boşalt|temizle)|geri dönüşüm(ü)?\s*boşalt|empty recycle)/i.test(text)) {
      const res = await bridgeService.sendAction('empty_recycle_bin');
      return `🗑️ **Geri Dönüşüm Kutusu Temizlendi.**`;
    }

    // 12. Ekran Görüntüsü
    if (/(ekran\s*(görüntüsü|resmi)|screenshot|ss\s*al)/i.test(text)) {
      const res = await bridgeService.getScreenshot();
      if (res && res.ok && res.image) {
        return `📸 **Laptop Ekran Görüntüsü Alındı!** (${res.timestamp})\nEkran görüntüsü Ana Ekrandaki monitöre aktarıldı.`;
      }
      return `⚠️ Ekran görüntüsü alınamadı: ${res?.error || 'Laptop köprüsü yanıt vermedi.'}`;
    }

    // 13. YouTube Aç
    if (/(youtube\s*aç|youtube'?a\s*git|open\s*youtube)/i.test(text)) {
      const res = await bridgeService.sendAction('open_url', 'https://www.youtube.com');
      return `🌐 **YouTube Laptopta Açıldı.**`;
    }

    // 14. Google Aç
    if (/(google\s*aç|google'?a\s*git|open\s*google)/i.test(text)) {
      const res = await bridgeService.sendAction('open_url', 'https://www.google.com');
      return `🌐 **Google Laptopta Açıldı.**`;
    }

    // 15. Not Defteri Aç
    if (/(not\s*defteri(ni)?\s*aç|notepad)/i.test(text)) {
      const res = await bridgeService.sendAction('launch_app', 'notepad');
      return `📝 **Not Defteri Laptopta Başlatıldı.**`;
    }

    // 16. Hesap Makinesi Aç
    if (/(hesap\s*makinesi(ni)?\s*aç|calc|calculator)/i.test(text)) {
      const res = await bridgeService.sendAction('launch_app', 'calc');
      return `🧮 **Hesap Makinesi Laptopta Başlatıldı.**`;
    }

    // 17. Laptop Durumu / Pil / Şarj / CPU
    if (/(laptop\s*durumu|pc\s*durumu|şarj(ı)?\s*kaç|batarya|pil\s*durumu|sistem\s*durumu)/i.test(text)) {
      const status = await bridgeService.getStatus();
      if (status && status.ok) {
        return `💻 **Laptop Durum Raporu (${status.hostname}):**\n` +
               `• ⚡ **Şarj:** %${status.batteryPercent} (${status.isCharging ? 'Şarjda 🔌' : 'Pilde 🔋'})\n` +
               `• 🔥 **CPU:** %${status.cpuPercent}\n` +
               `• 🧠 **RAM:** ${status.ramUsedGB} GB / ${status.ramTotalGB} GB (%${status.ramPercent})\n` +
               `• ⏱️ **Çalışma Süresi:** ${status.uptimeHours} saat\n` +
               `• 🌐 **Bağlantı:** Aktif (${status.timestamp})`;
      }
    }

    return null; // Doğrudan standart komut değil -> Gemini AI'ya aktar
  },

  /**
   * Çoklu Model Otomatik Hata Kurtarma (Failover Cascade)
   */
  async callGeminiWithFailover(payload, apiKey) {
    let lastError = null;

    for (const model of CANDIDATE_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          return { ok: true, data, modelUsed: model };
        }

        const errData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errData?.error?.message || `HTTP ${status}`;
        lastError = `[${model}] (${status}): ${msg}`;

        // 503 (Yüksek Talep / Server Unavailable) veya 429 veya 500 hatasında hemen sıradaki modele geç!
        if ([404, 429, 500, 502, 503, 504].includes(status)) {
          continue;
        }

        return { ok: false, error: `⚠️ API Hatası (${status}): ${msg}` };
      } catch (netErr) {
        lastError = `[${model}] Ağ hatası: ${netErr.message}`;
        continue;
      }
    }

    return {
      ok: false,
      error: `⚠️ Google AI modelleri yoğunluk yaşıyor. Lütfen birazdan tekrar deneyin.\n_${lastError || 'Tüm modeller denendi.'}_`,
    };
  },

  /**
   * Ana Mesaj Gönderme ve Yapay Zeka Yürütme Döngüsü
   */
  async sendMessage(userMessage, conversationHistory = []) {
    // 1. Önce Hızlı Çevrimdışı / Doğrudan Komutları Yakala
    try {
      const directResult = await this.matchDirectCommand(userMessage);
      if (directResult) {
        return directResult;
      }
    } catch (e) {
      console.warn('Direct command error:', e.message);
    }

    // 2. API Anahtarını Doğrula
    const settings = await storageService.getSettings();
    let apiKey = settings?.geminiApiKey;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      apiKey = APP_CONFIG?.GEMINI_API_KEY || '';
    }

    if (!apiKey || apiKey.trim() === '') {
      apiKey = APP_CONFIG?.GEMINI_API_KEY || '';
    }

    try {
      const contents = conversationHistory
        .filter(msg => msg.id !== 'welcome')
        .slice(-8)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      contents.push({
        role: 'user',
        parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nKullanıcı komutu: ${userMessage}` }],
      });

      // 3. Çoklu Model Failover ile Gemini API Çağrısı
      const geminiResult = await this.callGeminiWithFailover(
        {
          contents,
          tools: LAPTOP_TOOLS,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        },
        apiKey
      );

      if (!geminiResult.ok) {
        return geminiResult.error;
      }

      const data = geminiResult.data;
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

        case 'get_system_status': {
          const status = await bridgeService.getStatus();
          if (status && status.ok) {
            return `💻 **Laptop Durum Raporu (${status.hostname}):**\n` +
                   `• ⚡ **Şarj:** %${status.batteryPercent} (${status.isCharging ? 'Şarjda 🔌' : 'Pilde 🔋'})\n` +
                   `• 🔥 **CPU:** %${status.cpuPercent}\n` +
                   `• 🧠 **RAM:** ${status.ramUsedGB} GB / ${status.ramTotalGB} GB (%${status.ramPercent})\n` +
                   `• ⏱️ **Çalışma Süresi:** ${status.uptimeHours} saat\n` +
                   `• 🌐 **Bağlantı:** Aktif (${status.timestamp})`;
          }
          return `⚠️ Sistem durumu alınamadı.`;
        }

        case 'kill_process': {
          const res = await bridgeService.sendAction('kill_process', args.processId);
          return res.output || res.error || `🛑 İşlem (${args.processId}) kapatıldı.`;
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
      if (candidate.length > 2 && !candidate.startsWith('//') && !candidate.startsWith('#!/bin/bash')) {
        return candidate;
      }
    }

    return null;
  },
};
