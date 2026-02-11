# Galeri Düzenleyici E.T

Bu proje, kullanıcının galerisini yapay zeka destekli şekilde düzenlemek için hazırlanmış bir Expo React Native uygulama taslağıdır.

## Özellikler

- Splash ekranı: **Akıllı Arşiv: Dijital Düzenleyiciniz**
- İzin modalı: Galeri okuma izni akışı (Allow / Deny)
- Tarama aşaması:
  - Fotoğrafları tarar ve sınıflandırır
  - Ekran görüntülerini ve kamera fotoğraflarını ayırır
  - Videoları dosya boyutuna göre büyükten küçüğe sıralar
- Sonuç sekmeleri:
  - **Galeri**: Ekran Görüntüleri / Diğer Fotoğraflar / Videolar (3 ana bölüm)
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


## Expo Go Uyarıları (Normal Davranış)

Terminalde şu uyarıyı görmeniz beklenebilir:

- `Due to changes in Androids permission requirements, Expo Go can no longer provide full access to the media library...`

Bu, Android 13+ izin modeli nedeniyle **Expo Go kısıtı**dır. `expo-media-library` ile tam silme/erişim senaryolarını doğrulamak için **development build** kullanın:

```bash
npm run build:dev:android
npm run start:dev
```

Sonra telefona kurulan development client ile projeyi açın.

Ayrıca şu uyarı:

- `SafeAreaView has been deprecated... use react-native-safe-area-context`

kod tarafında giderildi; uygulama artık `react-native-safe-area-context` içindeki `SafeAreaView` kullanır.

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
