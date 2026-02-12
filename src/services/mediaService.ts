import * as MediaLibrary from 'expo-media-library';
import { sortVideosBySize } from '../utils/videoLogic';

export interface VideoAsset {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  duration?: number;
}

export interface PhotoAsset {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  width?: number;
  height?: number;
}

const PAGE_SIZE = 500;

export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

async function getAllAssets(mediaType: MediaLibrary.MediaTypeValue): Promise<MediaLibrary.Asset[]> {
  const collected: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: [mediaType],
      first: PAGE_SIZE,
      after
    });

    collected.push(...page.assets);
    hasNextPage = page.hasNextPage;
    after = page.endCursor ?? undefined;
  }

  return collected;
}

export async function loadVideosSortedBySize(): Promise<VideoAsset[]> {
  const assets = await getAllAssets(MediaLibrary.MediaType.video);

  return sortVideosBySize(
    assets.map((video) => ({
      id: video.id,
      uri: video.uri,
      filename: video.filename,
      fileSize: (video as MediaLibrary.Asset & { fileSize?: number }).fileSize ?? 0,
      duration: video.duration
    }))
  );
}

export async function loadPhotosFromGallery(): Promise<PhotoAsset[]> {
  const assets = await getAllAssets(MediaLibrary.MediaType.photo);

  return assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    fileSize: (asset as MediaLibrary.Asset & { fileSize?: number }).fileSize ?? 0,
    width: asset.width,
    height: asset.height
  }));
}

export async function deleteMediaAssets(assetIds: string[]): Promise<void> {
  if (!assetIds.length) {
    return;
  }
  await MediaLibrary.deleteAssetsAsync(assetIds);
}

export async function deleteVideos(videoIds: string[]): Promise<void> {
  await deleteMediaAssets(videoIds);
}
