# Galeri Düzenleyici E.T

Bu proje, kullanıcının galerisini yapay zeka destekli şekilde düzenlemek için geliştirilen bir Expo React Native uygulamasıdır.

## Özellikler

- Splash ekranı: **Akıllı Arşiv: Dijital Düzenleyiciniz**
- Açılış gizlilik bildirimi: **Fotoğraf ve videolar cihaz dışına aktarılmaz**
- İzin modalı: Galeri okuma izni akışı (Allow / Deny)
- Tarama aşaması:
  - Videoları boyuta göre sıralama (sayfalı tarama ile tüm galeri)
  - Fotoğrafları tarayıp ekran görüntüsü/fotoğraf + önemli/önemsiz olarak sınıflandırma
- Sonuç sekmeleri:
  - **Ekran Görüntüleri** (Önemli / Önemsiz alt filtre)
  - **Fotoğraflar** (Önemli / Önemsiz alt filtre)
  - **Videolar** (büyükten küçüğe)
- Görsel ve video sekmelerinde:
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


## AI Model Entegrasyonu (Production)

Gerçek OCR/vision sınıflandırması için uzak model endpointi bağlayabilirsiniz:

- `EXPO_PUBLIC_AI_API_URL`: Sınıflandırma endpoint URL
- `EXPO_PUBLIC_AI_API_KEY`: (opsiyonel) Bearer token

Eğer URL verilmezse uygulama güvenli fallback olarak yerel sınıflandırma sezgilerine döner.

Beklenen endpoint gövdesi:

```json
{
  "prompt": "MASTER_VISION_PROMPT",
  "image": {
    "uri": "file://...",
    "filename": "IMG_1234.jpg",
    "width": 1080,
    "height": 1920
  }
}
```

Beklenen yanıt:

```json
{
  "ana_kategori": "EKRAN_GORUNTUSU" | "DIGER_GORUNTU",
  "onem_durumu": "ONEMLI" | "ONEMSIZ",
  "etiket": "Hukuk" | "Dekont" | "Bulanık" | "Anı" | "Sosyal Medya" | "Belge" | "Ürün" | "Seyahat" | "Kimlik" | "Çöp",
  "gerekce": "Kısa açıklama"
}
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

- `App.tsx`: Ana akış, izin, tarama, sekmeler, gerçek galeri sınıflandırma ve kalıcı silme UI
- `src/services/mediaService.ts`: `expo-media-library` entegrasyonu
- `src/services/aiPrompt.ts`: Arka plan modeline gönderilecek sistem promptu + örnek sınıflandırma sözleşmesi
- `AI_CLASSIFICATION_PROMPT_TR.md`: Promptun detaylı ürün dokümantasyonu
