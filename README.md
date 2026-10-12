# 🌟 Aura - AI Kişisel Yaşam & Alışkanlık Asistanı 📱

Modern, çapraz platform (iOS & Android) destekli, yapay zeka destekli kişisel koçluk ve alışkanlık takip mobil uygulaması.

---

## ✨ Özellikler

1. **🏠 Akıllı Kontrol Paneli (Dashboard):**
   - Saate ve güne göre dinamik selamlama ve motivasyon sözü.
   - Günlük alışkanlık tamamlama yüzdesi ve ilerleme çubuğu.
   - Anlık ruh hali seçici (Enerjik, Harika, Sakin, Yorgun, Odaklı).
   - Hızlı tamamlanabilir alışkanlık kartları.

2. **🤖 Aura AI Asistanı & Yaşam Koçu:**
   - Google Gemini yapay zeka modeli ile entegre canlı sohbet ekranı.
   - Günlük hedefler belirleme, motivasyon, odaklanma ve zihinsel sağlık tavsiyeleri.
   - Hızlı öneri baloncukları ile tek dokunuşla soru sorma.
   - **Offline / Akıllı Demo Modu:** API anahtarı girilmemiş olsa bile yerel yanıtlarla kesintisiz çalışır.

3. **🎯 Alışkanlık & Görev Takibi (Habits & Streaks):**
   - Sağlık, Gelişim, Zihin, Üretkenlik kategorilerinde özel alışkanlıklar ekleme.
   - Gün serisi (streak 🔥) sayacı.
   - Tamamlanan alışkanlıkları işaretleme ve silme.
   - Telefon hafızasında (`AsyncStorage`) kalıcı veri saklama.

4. **📖 Ruh Hali & Zihin Günlüğü (Journal):**
   - Günün modunu ve duygusal durumunu seçme.
   - Günlük notlar ve öğrenimler yazma.
   - Tarihsel geçmiş günlüğü listesi.

5. **⚙️ Ayarlar & API Anahtarı Yönetimi:**
   - Google Gemini API anahtarını doğrudan uygulama içinden girme ve tek tuşla bağlantıyı test etme.
   - Profil adı belirleme.
   - Sistem tanılama ve sürüm bilgisi.

---

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
* Bilgisayarınızda **Node.js** (v18+) kurulu olmalıdır.
* Telefonunuzda test etmek için App Store veya Google Play'den ücretsiz **Expo Go** uygulamasını indirin.

### 2. Projeyi Çalıştırma

Terminalde proje dizinine gidin ve bağımlılıkları yükleyin:

```bash
npm install
```

Geliştirici sunucusunu başlatın:

```bash
npm start
```

### 3. Telefonunuzda Açma (60 Saniyede!)
1. Terminalde beliren **QR Kodu** telefonunuzun kamerasıyla veya **Expo Go** uygulamasından taratın.
2. Uygulama anında telefonunuzda canlı olarak açılacaktır!
3. Bilgisayarda tarayıcıda test etmek isterseniz terminalde `w` tuşuna basmanız yeterlidir.

---

## 🔑 API Anahtarını Ekleme (İki Kolay Yol)

Bu uygulamayı canlı Google Gemini zekasıyla donatmak tamamen ücretsizdir:

### Yol A (Uygulama İçinden - En Kolayı):
1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresinden ücretsiz bir API anahtarı alın.
2. Uygulamayı açın ve **Ayarlar ⚙️** sekmesine gidin.
3. Anahtarınızı kutucuğa yapıştırıp **"Anahtarı Test Et"** ve ardından **"Kaydet"** butonuna dokunun!

### Yol B (.env Dosyasından):
Proje kök dizinindeki `.env` dosyasını açın:
```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...SİZİN_ANAHTARINIZ
```

---

## 🛠️ Teknoloji Yığını
* **Framework:** React Native & Expo 52
* **Dil:** JavaScript / TypeScript desteği
* **Yerel Depolama:** `@react-native-async-storage/async-storage`
* **Yapay Zeka:** Google Gemini 1.5 Flash API (REST)
* **İkonlar & Tasarım:** Modern Koyu Tema (Dark Mode Slate / Indigo Palette)
