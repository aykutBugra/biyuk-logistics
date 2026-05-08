export type SavedMediaFile = {
  storageKey: string;
};

export type SaveMediaFileInput = {
  storageKey: string;
  buffer: Buffer;
  contentType: string;
};

export abstract class MediaStorageService {
  abstract saveFile(input: SaveMediaFileInput): Promise<SavedMediaFile>;
  abstract deleteFile(storageKey: string): Promise<void>;
  abstract toPublicUrl(storageKey: string): string;
}
