import * as MediaLibrary from 'expo-media-library';
import { sortVideosBySize } from '../utils/videoLogic';

export interface VideoAsset {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  duration?: number;
}

export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function loadVideosSortedBySize(): Promise<VideoAsset[]> {
  const assets = await MediaLibrary.getAssetsAsync({
    mediaType: 'video',
    first: 2000
  });

  return sortVideosBySize(
    assets.assets.map((video) => ({
      id: video.id,
      uri: video.uri,
      filename: video.filename,
      fileSize: video.fileSize ?? 0,
      duration: video.duration
    }))
  );
}

export async function deleteVideos(videoIds: string[]): Promise<void> {
  if (!videoIds.length) {
    return;
  }
  await MediaLibrary.deleteAssetsAsync(videoIds);
}
