function sortVideosBySize(videos) {
  return [...videos].sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
}

function createSizeBuckets(videos) {
  return {
    top: videos.filter((v) => (v.fileSize || 0) > 1024 * 1024 * 1024),
    mid: videos.filter((v) => (v.fileSize || 0) >= 100 * 1024 * 1024 && (v.fileSize || 0) <= 1024 * 1024 * 1024),
    low: videos.filter((v) => (v.fileSize || 0) < 100 * 1024 * 1024)
  };
}

function toggleSelectedId(selectedIds, id) {
  return selectedIds.includes(id)
    ? selectedIds.filter((item) => item !== id)
    : [...selectedIds, id];
}

function selectAllIds(videos) {
  return videos.map((video) => video.id);
}

module.exports = {
  sortVideosBySize,
  createSizeBuckets,
  toggleSelectedId,
  selectAllIds
};
