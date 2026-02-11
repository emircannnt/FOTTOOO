export type Importance = 'ONEMLI' | 'ONEMSIZ';

export type MainCategory = 'EKRAN_GORUNTUSU' | 'DIGER_GORUNTU';

export type ClassificationTag =
  | 'Hukuk'
  | 'Dekont'
  | 'Kimlik'
  | 'Seyahat'
  | 'Sosyal Medya'
  | 'Anı'
  | 'Belge'
  | 'Ürün'
  | 'Bulanık'
  | 'Çöp';

export interface ClassificationResult {
  ana_kategori: MainCategory;
  onem_durumu: Importance;
  etiket: ClassificationTag;
  gerekce: string;
}
