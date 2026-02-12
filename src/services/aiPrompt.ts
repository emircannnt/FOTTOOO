import type { ClassificationResult, ClassificationTag, Importance, MainCategory } from '../types';

export const AI_SYSTEM_PROMPT = `Akıllı Arşiv: Master Vision Prompt
Bu promptu, uygulamanın arka planında çalışan Yapay Zeka modeline göndereceksin.

Sistem Rolü: Sen profesyonel bir veri analisti ve görsel sınıflandırma uzmanısın. Görevin, kullanıcının galerisindeki görselleri analiz ederek "Akıllı Arşiv" yapısına uygun şekilde kategorize etmektir.`;

export const MASTER_VISION_PROMPT = AI_SYSTEM_PROMPT;

const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL ?? '';
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY ?? '';
const AI_TIMEOUT_MS = 12000;

const VALID_TAGS: ClassificationTag[] = [
  'Hukuk',
  'Dekont',
  'Kimlik',
  'Seyahat',
  'Sosyal Medya',
  'Anı',
  'Belge',
  'Ürün',
  'Bulanık',
  'Çöp'
];

export interface ClassificationSignal {
  filename: string;
  width?: number;
  height?: number;
  uri?: string;
}

const IMPORTANT_KEYWORDS = [
  'dekont',
  'iban',
  'fatura',
  'mahkeme',
  'dava',
  'pasaport',
  'ehliyet',
  'rezervasyon',
  'bilet',
  'pnr',
  'kimlik',
  'tc'
];

const UNIMPORTANT_KEYWORDS = [
  'whatsapp',
  'instagram',
  'meme',
  'chat',
  'sohbet',
  'oyun',
  'hava',
  'temp',
  'tmp'
];

function inferTag(content: string): ClassificationTag {
  if (content.includes('dekont') || content.includes('iban') || content.includes('fatura')) {
    return 'Dekont';
  }
  if (content.includes('mahkeme') || content.includes('dava')) {
    return 'Hukuk';
  }
  if (content.includes('pasaport') || content.includes('ehliyet') || content.includes('kimlik')) {
    return 'Kimlik';
  }
  if (content.includes('bilet') || content.includes('pnr') || content.includes('rezervasyon')) {
    return 'Seyahat';
  }
  if (content.includes('blur') || content.includes('bulan') || content.includes('odak')) {
    return 'Bulanık';
  }
  if (content.includes('market') || content.includes('urun') || content.includes('ürün')) {
    return 'Ürün';
  }
  if (content.includes('belge') || content.includes('sozlesme') || content.includes('sözleşme')) {
    return 'Belge';
  }
  if (content.includes('instagram') || content.includes('whatsapp') || content.includes('meme')) {
    return 'Sosyal Medya';
  }
  return 'Anı';
}

function looksLikeScreenshot(signal: ClassificationSignal): boolean {
  const normalized = `${signal.filename} ${signal.uri ?? ''}`.toLowerCase();
  const byKeyword =
    normalized.includes('screenshot') ||
    normalized.includes('ekran görüntüsü') ||
    normalized.includes('ekran_goruntusu') ||
    normalized.includes('screen');

  if (byKeyword) {
    return true;
  }

  if (!signal.width || !signal.height) {
    return false;
  }

  const portraitLong = signal.height > signal.width && signal.height / signal.width > 1.7;
  const landscapeLong = signal.width > signal.height && signal.width / signal.height > 1.7;
  return portraitLong || landscapeLong;
}

function normalizeCategory(value: unknown): MainCategory {
  return value === 'EKRAN_GORUNTUSU' ? 'EKRAN_GORUNTUSU' : 'DIGER_GORUNTU';
}

function normalizeImportance(value: unknown): Importance {
  return value === 'ONEMLI' ? 'ONEMLI' : 'ONEMSIZ';
}

function normalizeTag(value: unknown, fallbackText: string): ClassificationTag {
  if (typeof value === 'string' && VALID_TAGS.includes(value as ClassificationTag)) {
    return value as ClassificationTag;
  }
  return inferTag(fallbackText);
}

function fallbackClassification(signal: ClassificationSignal): ClassificationResult {
  const normalized = `${signal.filename} ${signal.uri ?? ''}`.toLowerCase();
  const isScreenshot = looksLikeScreenshot(signal);

  const isImportant = IMPORTANT_KEYWORDS.some((word) => normalized.includes(word));
  const isUnimportant = UNIMPORTANT_KEYWORDS.some((word) => normalized.includes(word));

  return {
    ana_kategori: isScreenshot ? 'EKRAN_GORUNTUSU' : 'DIGER_GORUNTU',
    onem_durumu: isImportant && !isUnimportant ? 'ONEMLI' : 'ONEMSIZ',
    etiket: inferTag(normalized),
    gerekce: 'Yerel içerik sinyalleri (dosya adı/ölçü) ile sınıflandırıldı.'
  };
}

async function classifyWithRemoteModel(signal: ClassificationSignal): Promise<ClassificationResult | null> {
  if (!AI_API_URL) {
    return null;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_API_KEY ? { Authorization: `Bearer ${AI_API_KEY}` } : {})
      },
      body: JSON.stringify({
        prompt: MASTER_VISION_PROMPT,
        image: {
          uri: signal.uri,
          filename: signal.filename,
          width: signal.width,
          height: signal.height
        }
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<ClassificationResult>;
    const normalizedText = `${signal.filename} ${signal.uri ?? ''}`.toLowerCase();

    return {
      ana_kategori: normalizeCategory(payload.ana_kategori),
      onem_durumu: normalizeImportance(payload.onem_durumu),
      etiket: normalizeTag(payload.etiket, normalizedText),
      gerekce:
        typeof payload.gerekce === 'string' && payload.gerekce.trim().length > 0
          ? payload.gerekce
          : 'Uzak model cevabı normalize edildi.'
    };
  } catch (error) {
    void error;
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyImageWithPrompt(signal: ClassificationSignal): Promise<ClassificationResult> {
  const remote = await classifyWithRemoteModel(signal);
  if (remote) {
    return remote;
  }
  return fallbackClassification(signal);
}
