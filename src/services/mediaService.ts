import * as MediaLibrary from 'expo-media-library';
import { classifyPhotoAsset } from '../utils/galleryClassifier';
import { sortVideosBySize } from '../utils/videoLogic';
import type { PhotoAssetItem } from '../types';

export interface VideoAsset {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  duration?: number;
}

export interface GalleryScanResult {
  photos: PhotoAssetItem[];
  screenshots: PhotoAssetItem[];
  cameraPhotos: PhotoAssetItem[];
  videos: VideoAsset[];
}

export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

async function withSize(asset: MediaLibrary.Asset): Promise<number> {
  if (asset.fileSize && asset.fileSize > 0) {
    return asset.fileSize;
  }
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id);
    return info.fileSize ?? 0;
  } catch (error) {
    void error;
    return 0;
  }
}

export async function loadVideosSortedBySize(): Promise<VideoAsset[]> {
  const assets = await MediaLibrary.getAssetsAsync({
    mediaType: 'video',
    first: 2000
  });

  const videosWithSize = await Promise.all(
    assets.assets.map(async (video) => ({
      id: video.id,
      uri: video.uri,
      filename: video.filename,
      fileSize: await withSize(video),
      duration: video.duration
    }))
  );

  return sortVideosBySize(videosWithSize);
}

export async function loadAndClassifyPhotos(): Promise<PhotoAssetItem[]> {
  const assets = await MediaLibrary.getAssetsAsync({
    mediaType: 'photo',
    first: 3000
  });

  return Promise.all(
    assets.assets.map(async (photo) => ({
      id: photo.id,
      uri: photo.uri,
      filename: photo.filename,
      mediaSubtypes: photo.mediaSubtypes,
      fileSize: await withSize(photo),
      classification: classifyPhotoAsset(photo)
    }))
  );
}

export async function scanGallery(): Promise<GalleryScanResult> {
  const [photos, videos] = await Promise.all([loadAndClassifyPhotos(), loadVideosSortedBySize()]);

  const screenshots = photos.filter((photo) => photo.classification.ana_kategori === 'EKRAN_GORUNTUSU');
  const cameraPhotos = photos.filter((photo) => photo.classification.ana_kategori === 'DIGER_GORUNTU');

  return {
    photos,
    screenshots,
    cameraPhotos,
    videos
  };
}

export async function deleteVideos(videoIds: string[]): Promise<void> {
  if (!videoIds.length) {
    return;
  }
  await MediaLibrary.deleteAssetsAsync(videoIds);
}
