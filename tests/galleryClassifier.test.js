const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyPhotoAsset, detectScreenshot } = require('../src/utils/galleryClassifier');

test('detectScreenshot true for screenshot subtype', () => {
  const result = detectScreenshot({ filename: 'IMG_1.jpg', mediaSubtypes: ['screenshot'] });
  assert.equal(result, true);
});

test('classify important screenshot by keyword', () => {
  const classification = classifyPhotoAsset({
    filename: 'mahkeme_karar_screenshot.png',
    uri: 'file://photo.png',
    mediaSubtypes: ['screenshot']
  });

  assert.equal(classification.ana_kategori, 'EKRAN_GORUNTUSU');
  assert.equal(classification.onem_durumu, 'ONEMLI');
});

test('classify camera photo as important memory by default', () => {
  const classification = classifyPhotoAsset({
    filename: 'IMG_2026_12_31.jpg',
    uri: 'file://IMG_2026_12_31.jpg',
    mediaSubtypes: []
  });

  assert.equal(classification.ana_kategori, 'DIGER_GORUNTU');
  assert.equal(classification.onem_durumu, 'ONEMLI');
});
