# Akıllı Arşiv: Master Vision Prompt

Bu promptu, uygulamanın arka planında çalışan Yapay Zeka modeline göndereceksin.

## Sistem Rolü

Sen profesyonel bir veri analisti ve görsel sınıflandırma uzmanısın. Görevin, kullanıcının galerisindeki görselleri analiz ederek "Akıllı Arşiv" yapısına uygun şekilde kategorize etmektir.

## Analiz Hiyerarşisi

### ADIM 1: TÜR TESPİTİ

- **[EKRAN_GORUNTUSU]**: Görsel dijital bir arayüz mü? (Üst bar, saat, sinyal simgeleri, uygulama butonları, klavye varsa EVET).
- **[DIGER_GORUNTU]**: Görsel bir kamera merceğinden mi çıktı? (Doğal ışık, gölge, optik derinlik, insan, manzara varsa EVET).

### ADIM 2: DERİN SINIFLANDIRMA

#### A) EKRAN GÖRÜNTÜLERİ İÇİN

- **[ONEMLI]**: İçerikte şu kelimelerden biri geçiyor mu?
  - Hukuki: Dava, Esas, Karar, Mahkeme, Avukat, Tebligat.
  - Finans: IBAN, Dekont, EFT, Havale, Fatura, Hesap No, Tutar.
  - Kimlik: TC, Pasaport, Ehliyet, Tapu, Ruhsat, QR.
  - Seyahat: PNR, Bilet, Rezervasyon, Koltuk, Uçuş.

- **[ONEMSIZ]**: WhatsApp/Instagram sohbetleri, oyun skorları, hava durumu, Google arama sonuçları, rastgele internet esprileri (memes).

#### B) DİĞER GÖRÜNTÜLER (KAMERA) İÇİN

- **[ONEMLI]**:
  - Anı: Yüzlerin net olduğu portreler, manzara, aile, evcil hayvan.
  - Belge Çekimi: Masada çekilmiş fiziksel kağıtlar, sözleşmeler, kimlik kartları.
  - Ürün: Fiyat etiketi, market rafı, ürün barkodu.

- **[ONEMSIZ - COPU TEMIZLE]**:
  - Teknik Hata: Blurlu (bulanık), odak dışı, sarsılmış (kayan) görüntüler.
  - Hatalı Çekim: Cebin içi (siyah), parmak izi kapatılmış lens, aşırı karanlık veya aşırı parlamış (beyaz) kareler.
  - Yinelenen: Tıpatıp aynı olan seri çekimlerin düşük kaliteli olanları.

## ÇIKTI FORMATI (JSON)

```json
{
  "ana_kategori": "EKRAN_GORUNTUSU" | "DIGER_GORUNTU",
  "onem_durumu": "ONEMLI" | "ONEMSIZ",
  "etiket": "Hukuk" | "Dekont" | "Bulanık" | "Anı" | "Sosyal Medya" vb.,
  "gerekce": "Kısa ve öz açıklama"
}
```

## 📹 Video Sıralama Mantığı (Büyükten Küçüğe)

Uygulamanın ana ekranında veya "Depolama Yönetimi" sekmesinde videoları şu mantıkla dizeceğiz:

- **İzin Sonrası Tetikleyici:** Kullanıcı galeri izni verdiği an `expo-media-library` üzerinden `getAssetsAsync` fonksiyonunu `mediaType: 'video'` filtresiyle çağırırız.
- **Sıralama Algoritması:** Her video dosyasının `modificationTime` (tarih) yerine `fileSize` (bayt cinsinden boyut) verisini çekeriz.

**UI Görünümü:**
- En Üstte: 4K videolar, uzun ekran kayıtları (>1 GB).
- Ortada: Orta boy videolar (100 MB - 500 MB).
- En Altta: Kısa WhatsApp videoları (<10 MB).

## 📲 Uygulama Akış Planı (User Flow)

1. **Açılış (Splash Screen):** "Akıllı Arşiv: Dijital Düzenleyiciniz" yazar.
2. **İzin İsteme:** Şık bir modal açılır: "Galerinizdeki karmaşayı çözmemiz için okuma izni vermelisiniz." (Allow/Deny).
3. **Büyük Tarama (Scanning):**
   - Ekranda bir ilerleme çubuğu (Progress Bar) döner.
   - "Videolar boyutlarına göre diziliyor..."
   - "Fotoğraflar yapay zeka ile analiz ediliyor..." (Burada yukarıdaki prompt çalışır).
4. **Sonuç Ekranı:**
   - Sekme 1 (Önemli): Dekontlar, Davalar, Biletler (Kilitli/Şifreli alan).
   - Sekme 2 (Temizlik): Blurlu fotolar, yinelenenler, çöp videolar (Tek tuşla silme).
   - Sekme 3 (Videolar): En çok yer kaplayandan en az yer kaplayana sıralı liste.
