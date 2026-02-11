const IMPORTANT_SCREEN_KEYWORDS = [
  'dava',
  'esas',
  'karar',
  'mahkeme',
  'avukat',
  'tebligat',
  'iban',
  'dekont',
  'eft',
  'havale',
  'fatura',
  'hesap',
  'tutar',
  'tc',
  'pasaport',
  'ehliyet',
  'tapu',
  'ruhsat',
  'qr',
  'pnr',
  'bilet',
  'rezervasyon',
  'koltuk',
  'ucus'
];

const UNIMPORTANT_HINTS = ['whatsapp', 'instagram', 'meme', 'weather', 'hava', 'score', 'oyun'];
const TRASH_HINTS = ['blur', 'bulanik', 'blurry', 'shake', 'karanlik', 'dark', 'black', 'finger'];

function normalize(value) {
  return (value || '').toLocaleLowerCase('tr-TR');
}

function detectScreenshot(asset) {
  const subtype = normalize(asset.mediaSubtypes?.join(' '));
  const name = normalize(asset.filename);
  return subtype.includes('screenshot') || name.includes('screenshot') || name.includes('ekran görüntüsü');
}

function classifyPhotoAsset(asset) {
  const text = `${normalize(asset.filename)} ${normalize(asset.uri)}`;
  const isScreenshot = detectScreenshot(asset);

  if (isScreenshot) {
    const importantKeyword = IMPORTANT_SCREEN_KEYWORDS.find((keyword) => text.includes(keyword));
    if (importantKeyword) {
      return {
        ana_kategori: 'EKRAN_GORUNTUSU',
        onem_durumu: 'ONEMLI',
        etiket: importantKeyword === 'dekont' || importantKeyword === 'iban' ? 'Dekont' : 'Hukuk',
        gerekce: `Ekran görüntüsünde kritik anahtar kelime tespit edildi: ${importantKeyword}`
      };
    }

    const socialKeyword = UNIMPORTANT_HINTS.find((keyword) => text.includes(keyword));
    if (socialKeyword) {
      return {
        ana_kategori: 'EKRAN_GORUNTUSU',
        onem_durumu: 'ONEMSIZ',
        etiket: 'Sosyal Medya',
        gerekce: `Ekran görüntüsü sosyal/önemsiz içerik işareti taşıyor: ${socialKeyword}`
      };
    }

    return {
      ana_kategori: 'EKRAN_GORUNTUSU',
      onem_durumu: 'ONEMSIZ',
      etiket: 'Sosyal Medya',
      gerekce: 'Ekran görüntüsü kritik anahtar kelime içermiyor.'
    };
  }

  const trashKeyword = TRASH_HINTS.find((keyword) => text.includes(keyword));
  if (trashKeyword) {
    return {
      ana_kategori: 'DIGER_GORUNTU',
      onem_durumu: 'ONEMSIZ',
      etiket: 'Bulanık',
      gerekce: `Düşük kalite göstergesi bulundu: ${trashKeyword}`
    };
  }

  return {
    ana_kategori: 'DIGER_GORUNTU',
    onem_durumu: 'ONEMLI',
    etiket: 'Anı',
    gerekce: 'Kamera fotoğrafı anı/belge/ürün adayı olarak işaretlendi.'
  };
}

function splitByImportance(classifiedPhotos) {
  return {
    important: classifiedPhotos.filter((photo) => photo.classification.onem_durumu === 'ONEMLI'),
    unimportant: classifiedPhotos.filter((photo) => photo.classification.onem_durumu === 'ONEMSIZ')
  };
}

module.exports = {
  classifyPhotoAsset,
  splitByImportance,
  detectScreenshot
};
