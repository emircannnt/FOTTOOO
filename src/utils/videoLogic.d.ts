export interface MinimalVideo {
  id: string;
  fileSize?: number;
}

export function sortVideosBySize<T extends MinimalVideo>(videos: T[]): T[];
export function createSizeBuckets<T extends MinimalVideo>(videos: T[]): {
  top: T[];
  mid: T[];
  low: T[];
};
export function toggleSelectedId(selectedIds: string[], id: string): string[];
export function selectAllIds<T extends MinimalVideo>(videos: T[]): string[];
