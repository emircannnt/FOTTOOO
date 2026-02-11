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

## Mimari

- `App.tsx`: Ana akış, izin, tarama, sekmeler ve video seç/sil UI
- `src/services/mediaService.ts`: `expo-media-library` entegrasyonu
- `src/services/aiPrompt.ts`: Arka plan modeline gönderilecek sistem promptu + örnek sınıflandırma sözleşmesi
- `AI_CLASSIFICATION_PROMPT_TR.md`: Promptun detaylı ürün dokümantasyonu
