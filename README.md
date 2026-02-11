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

## Expo Go ile %100 Uyumlu Kurulum (SDK 54)

Telefonda Expo Go güncel ise (SDK 54), proje bağımlılıkları da SDK 54 ile birebir uyumlu olmalıdır.

### 1) Temiz kurulum

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2) Expo bağımlılıklarını otomatik düzelt

```bash
npm run fix-deps
```

### 3) Uyum kontrolü

```bash
npm run doctor
```

### 4) Cache temizleyip başlat

```bash
npx expo start -c
```

> Eğer şu uyarıyı görürseniz:
>
> `react-native@0.81.4 - expected version: 0.81.5`
>
> proje dosyasında sürümü `0.81.5` yapıp yeniden `npm install` + `npm run fix-deps` çalıştırın.

## Geliştirme Komutları

```bash
npm run start
npm run android
npm run ios
npm run web
npm test
```

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
