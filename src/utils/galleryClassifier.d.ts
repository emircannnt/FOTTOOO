import type { ClassificationResult } from '../types';

export interface ClassifiableAsset {
  id: string;
  filename?: string;
  uri?: string;
  mediaSubtypes?: string[];
}

export interface ClassifiedAsset extends ClassifiableAsset {
  classification: ClassificationResult;
}

export function detectScreenshot(asset: ClassifiableAsset): boolean;
export function classifyPhotoAsset(asset: ClassifiableAsset): ClassificationResult;
export function splitByImportance(classifiedPhotos: ClassifiedAsset[]): {
  important: ClassifiedAsset[];
  unimportant: ClassifiedAsset[];
};
