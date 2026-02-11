const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sortVideosBySize,
  createSizeBuckets,
  toggleSelectedId,
  selectAllIds
} = require('../src/utils/videoLogic');

test('sortVideosBySize orders descending by fileSize', () => {
  const videos = [
    { id: '1', fileSize: 20 },
    { id: '2', fileSize: 100 },
    { id: '3', fileSize: 50 }
  ];

  const sorted = sortVideosBySize(videos);
  assert.deepEqual(
    sorted.map((v) => v.id),
    ['2', '3', '1']
  );
});

test('createSizeBuckets classifies top/mid/low ranges', () => {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;
  const buckets = createSizeBuckets([
    { id: 'top', fileSize: GB + 1 },
    { id: 'mid', fileSize: 300 * MB },
    { id: 'low', fileSize: 5 * MB }
  ]);

  assert.equal(buckets.top.length, 1);
  assert.equal(buckets.mid.length, 1);
  assert.equal(buckets.low.length, 1);
});

test('toggleSelectedId toggles existing/new ids', () => {
  assert.deepEqual(toggleSelectedId([], 'x'), ['x']);
  assert.deepEqual(toggleSelectedId(['x', 'y'], 'x'), ['y']);
});

test('selectAllIds returns all ids', () => {
  assert.deepEqual(
    selectAllIds([
      { id: 'a', fileSize: 1 },
      { id: 'b', fileSize: 2 }
    ]),
    ['a', 'b']
  );
});
