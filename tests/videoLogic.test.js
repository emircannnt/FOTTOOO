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

test('createSizeBuckets classifies full top/mid/low ranges', () => {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;
  const buckets = createSizeBuckets([
    { id: 'top', fileSize: GB + 1 },
    { id: 'mid', fileSize: 300 * MB },
    { id: 'low', fileSize: 5 * MB },
    { id: 'edge-low', fileSize: 99 * MB },
    { id: 'edge-mid-1', fileSize: 100 * MB },
    { id: 'edge-mid-2', fileSize: GB }
  ]);

  assert.equal(buckets.top.length, 1);
  assert.equal(buckets.mid.length, 3);
  assert.equal(buckets.low.length, 2);
});

test('createSizeBuckets covers every video exactly once', () => {
  const MB = 1024 * 1024;
  const videos = [
    { id: 'a', fileSize: 1 * MB },
    { id: 'b', fileSize: 50 * MB },
    { id: 'c', fileSize: 120 * MB },
    { id: 'd', fileSize: 600 * MB },
    { id: 'e', fileSize: 1200 * MB }
  ];

  const buckets = createSizeBuckets(videos);
  const allIds = [...buckets.top, ...buckets.mid, ...buckets.low].map((v) => v.id);
  assert.equal(allIds.length, videos.length);
  assert.equal(new Set(allIds).size, videos.length);
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
