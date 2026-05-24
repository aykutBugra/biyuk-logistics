export type SavedMediaFile = {
  storageKey: string;
};

export type SaveMediaFileInput = {
  storageKey: string;
  buffer: Buffer;
  contentType: string;
};


//doğrudan çalışmaz . gerçek bir medya depolama hizmeti sağlamak için 
//bu sınıfı genişleten bir sınıf oluşturulur . 
//Bugün local dosya sistemi kullanılıyor. 
//İleride Cloudinary veya Amazon S3 kullanılmak istenirse aynı
//sözleşmeye uyan yeni servis yazılabilir.
export abstract class MediaStorageService {
  abstract saveFile(input: SaveMediaFileInput): Promise<SavedMediaFile>;
  abstract deleteFile(storageKey: string): Promise<void>;
  abstract toPublicUrl(storageKey: string): string;
}
