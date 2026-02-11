# Galeri Düzenleyici E.T

Bu proje, kullanıcının galerisini yapay zeka destekli şekilde düzenlemek için hazırlanmış bir Expo React Native uygulama taslağıdır.

## Özellikler

- Splash ekranı: **Akıllı Arşiv: Dijital Düzenleyiciniz**
- İzin modalı: Galeri okuma izni akışı (Allow / Deny)
- Tarama aşaması:
  - Videoları boyuta göre sıralama
  - Fotoğrafları AI prompt ile analiz etme hazırlığı
- Sonuç sekmeleri:
  - **Önemli**
  - **Temizlik**
  - **Videolar** (büyükten küçüğe)
- Video sekmesinde:
  - **Tümünü Seç**
  - Tek tek dokunarak seçim
  - **Sil** (galeriden kalıcı silme)

## Kurulum

```bash
npm install
npm run start
```

## Expo Go Hata Çözümü (SDK uyumsuzluğu)

Eğer telefonda şu hatayı görüyorsanız:

> Project is incompatible with this version of Expo Go

Sebep: Telefonda Expo Go **SDK 54**, proje ise daha eski SDK ile açılmaya çalışıyor.

### Çözüm 1 (Önerilen): Projeyi SDK 54'e yükselt

Bu repo artık SDK 54 paketlerine ayarlanmıştır. Aşağıdaki komutları çalıştırın:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```

### Çözüm 2: Eski Expo Go yükle (önerilmez)

Projeyi yükseltmek istemiyorsanız, projedeki SDK sürümüyle uyumlu Expo Go APK kurmanız gerekir.

## Build Alma

### Android APK/AAB

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
eas build -p android --profile production
```

### iOS

```bash
eas build -p ios --profile production
```

## Mimari

- `App.tsx`: Ana akış, izin, tarama, sekmeler ve video seç/sil UI
- `src/services/mediaService.ts`: `expo-media-library` entegrasyonu
- `src/services/aiPrompt.ts`: Arka plan modeline gönderilecek sistem promptu + örnek sınıflandırma sözleşmesi
- `AI_CLASSIFICATION_PROMPT_TR.md`: Promptun detaylı ürün dokümantasyonu
