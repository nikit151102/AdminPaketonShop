import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment';

export interface UploadConfig {
  maxFileSize?: number; // в байтах
  allowedTypes?: string[]; // ['image/jpeg', 'image/png', ...]
  maxFiles?: number;
  compressQuality?: number; // качество сжатия (0-1)
  resizeTo?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  previewUrl?: string;
  uploadedUrl?: string;
}

export interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  file: File;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private readonly API_URL = `${environment.production}/upload`;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  private uploadProgress = new Subject<UploadProgress>();
  public uploadProgress$ = this.uploadProgress.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Загружает одиночное изображение
   */
  uploadImage(file: File, config?: UploadConfig): Observable<any> {
    const validation = this.validateFile(file, config);
    
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.processAndUpload(file, config).pipe(
      map(response => response.data),
      catchError(error => {
        this.updateProgress(file, 'error', 0, 0, error.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * Загружает несколько изображений
   */
  uploadMultipleImages(files: File[], config?: UploadConfig): Observable<UploadedImage[]> {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = this.validateFile(file, config);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    });

    if (errors.length > 0 && validFiles.length === 0) {
      return throwError(() => new Error(errors.join('; ')));
    }

    const uploadObservables = validFiles.map(file => 
      this.uploadImage(file, config)
    );

    // Возвращаем массив загруженных изображений
    return new Observable<UploadedImage[]>(observer => {
      const results: UploadedImage[] = [];
      let completed = 0;
      let hasError = false;

      uploadObservables.forEach((obs, index) => {
        obs.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            
            if (completed === validFiles.length && !hasError) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            hasError = true;
            observer.error(error);
          }
        });
      });
    });
  }

  /**
   * Загружает изображение с преобразованием в base64 (для предпросмотра)
   */
  getImagePreview(file: File, maxSize?: number): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        if (maxSize) {
          this.resizeImage(result, maxSize).then(resized => {
            observer.next(resized);
            observer.complete();
          }).catch(error => {
            observer.error(error);
          });
        } else {
          observer.next(result);
          observer.complete();
        }
      };
      
      reader.onerror = (error) => {
        observer.error(error);
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Удаляет загруженное изображение
   */
  deleteImage(imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${imageId}`);
  }

  /**
   * Получает информацию о загруженном изображении
   */
  getImageInfo(imageId: string): Observable<UploadedImage> {
    return this.http.get<{ data: UploadedImage }>(`${this.API_URL}/${imageId}/info`)
      .pipe(map(response => response.data));
  }

  /**
   * Генерирует URL для миниатюры изображения
   */
  getThumbnailUrl(imageId: string, width?: number, height?: number): string {
    const params: string[] = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return `${this.API_URL}/${imageId}/thumbnail${query}`;
  }

  /**
   * Проверяет файл на соответствие требованиям
   */
  validateFile(file: File, config?: UploadConfig): ImageValidationResult {
    const errors: string[] = [];
    const maxSize = config?.maxFileSize || this.MAX_FILE_SIZE;
    const allowedTypes = config?.allowedTypes || this.ALLOWED_TYPES;
    const maxFiles = config?.maxFiles;

    // Проверка размера
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`Файл слишком большой (максимум ${maxSizeMB}MB)`);
    }

    // Проверка типа
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Неподдерживаемый формат файла. Разрешены: ${allowedTypes.join(', ')}`);
    }

    // Проверка имени файла (безопасность)
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.name)) {
      errors.push('Имя файла содержит недопустимые символы');
    }

    return {
      isValid: errors.length === 0,
      errors,
      file
    };
  }

  /**
   * Сжимает изображение перед загрузкой
   */
  private compressImage(file: File, quality: number = 0.8): Observable<File> {
    return new Observable<File>(observer => {
      if (!file.type.startsWith('image/')) {
        observer.next(file);
        observer.complete();
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            observer.next(file);
            observer.complete();
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: file.type, lastModified: Date.now() }
                );
                observer.next(compressedFile);
                observer.complete();
              } else {
                observer.next(file);
                observer.complete();
              }
            },
            file.type,
            quality
          );
        };
        
        img.onerror = () => {
          observer.next(file);
          observer.complete();
        };
      };
      
      reader.onerror = () => {
        observer.next(file);
        observer.complete();
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Изменяет размер изображения
   */
  private resizeImage(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Не удалось создать canvas контекст'));
          return;
        }

        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = () => {
        reject(new Error('Не удалось загрузить изображение'));
      };
      
      img.src = dataUrl;
    });
  }

  /**
   * Обрабатывает и загружает файл
   */
  private processAndUpload(file: File, config?: UploadConfig): Observable<{ data: UploadedImage }> {
    return new Observable<{ data: UploadedImage }>(observer => {
      // Создаем preview URL
      const previewUrl = URL.createObjectURL(file);
      this.updateProgress(file, 'pending', 0, file.size);
      
      // Применяем сжатие если нужно
      let fileToUpload = file;
      const compressQuality = config?.compressQuality;
      
      if (compressQuality && compressQuality < 1) {
        this.compressImage(file, compressQuality).subscribe({
          next: (compressedFile) => {
            fileToUpload = compressedFile;
            this.doUpload(fileToUpload, config, previewUrl, observer);
          },
          error: () => {
            this.doUpload(fileToUpload, config, previewUrl, observer);
          }
        });
      } else {
        this.doUpload(fileToUpload, config, previewUrl, observer);
      }
    });
  }

  /**
   * Выполняет загрузку файла на сервер
   */
  private doUpload(
    file: File, 
    config: UploadConfig | undefined,
    previewUrl: string,
    observer: any
  ): void {
    const formData = new FormData();
    formData.append('file', file);
    
    // Добавляем метаданные если есть
    if (config?.resizeTo) {
      formData.append('resizeConfig', JSON.stringify(config.resizeTo));
    }
    
    const params = new HttpParams()
      .set('preserveOriginal', 'true')
      .set('generateThumbnail', 'true');
    
    const req = new HttpRequest(
      'POST',
      this.API_URL,
      formData,
      {
        reportProgress: true,
        params,
        responseType: 'json'
      }
    );
    
    this.http.request<{ data: UploadedImage }>(req).subscribe({
      next: (event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round((100 * event.loaded) / event.total);
              this.updateProgress(file, 'uploading', event.loaded, event.total);
            }
            break;
            
          case HttpEventType.Response:
            this.updateProgress(file, 'completed', file.size, file.size);
            
            // Освобождаем preview URL
            URL.revokeObjectURL(previewUrl);
            
            observer.next(event.body);
            observer.complete();
            break;
        }
      },
      error: (error) => {
        this.updateProgress(file, 'error', 0, file.size, error.message);
        
        // Освобождаем preview URL
        URL.revokeObjectURL(previewUrl);
        
        observer.error(error);
      }
    });
  }

  /**
   * Обновляет прогресс загрузки
   */
  private updateProgress(
    file: File, 
    status: UploadProgress['status'],
    loaded: number, 
    total: number,
    error?: string
  ): void {
    const progress: UploadProgress = {
      file,
      loaded,
      total,
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      status,
      error,
      previewUrl: status === 'pending' || status === 'uploading' ? 
        URL.createObjectURL(file) : undefined
    };
    
    this.uploadProgress.next(progress);
  }

  /**
   * Отменяет загрузку (имитация - в реальном приложении нужен AbortController)
   */
  cancelUpload(fileName: string): void {
    // В реальном приложении здесь должна быть логика отмены запроса
    console.log(`Загрузка файла ${fileName} отменена`);
  }

  /**
   * Очищает все временные URL (предотвращает утечки памяти)
   */
  cleanup(): void {
    // Этот метод должен вызываться при уничтожении компонента
    // В реальном приложении можно отслеживать все созданные URL
  }

  /**
   * Проверяет, является ли файл изображением
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Получает размеры изображения
   */
  getImageDimensions(file: File): Observable<{ width: number; height: number }> {
    return new Observable<{ width: number; height: number }>(observer => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          observer.next({
            width: img.width,
            height: img.height
          });
          observer.complete();
        };
        
        img.onerror = () => {
          observer.error(new Error('Не удалось определить размеры изображения'));
        };
      };
      
      reader.onerror = () => {
        observer.error(new Error('Не удалось прочитать файл'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Конвертирует base64 в File
   */
  base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Создает миниатюру изображения на клиенте
   */
  createThumbnail(file: File, maxWidth: number = 200): Observable<string> {
    return new Observable<string>(observer => {
      this.getImagePreview(file).subscribe({
        next: (dataUrl) => {
          this.resizeImage(dataUrl, maxWidth).then(thumbnail => {
            observer.next(thumbnail);
            observer.complete();
          }).catch(error => {
            observer.error(error);
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Пакетная загрузка изображений с ограничением параллелизма
   */
  uploadBatch(files: File[], config?: UploadConfig, maxConcurrent: number = 3): Observable<UploadedImage[]> {
    return new Observable<UploadedImage[]>(observer => {
      const results: UploadedImage[] = [];
      let currentIndex = 0;
      let completed = 0;
      let errors: string[] = [];
      let activeUploads = 0;
      
      const processNext = () => {
        while (activeUploads < maxConcurrent && currentIndex < files.length) {
          const file = files[currentIndex];
          currentIndex++;
          activeUploads++;
          
          this.uploadImage(file, config).subscribe({
            next: (result) => {
              results.push(result);
              completed++;
              activeUploads--;
              
              if (completed === files.length) {
                observer.next(results);
                observer.complete();
              } else {
                processNext();
              }
            },
            error: (error) => {
              errors.push(`${file.name}: ${error.message}`);
              completed++;
              activeUploads--;
              
              if (completed === files.length) {
                if (results.length === 0) {
                  observer.error(new Error(errors.join('; ')));
                } else {
                  observer.next(results);
                  observer.complete();
                }
              } else {
                processNext();
              }
            }
          });
        }
      };
      
      // Валидация всех файлов перед началом
      const validationResults = files.map(file => this.validateFile(file, config));
      const invalidFiles = validationResults.filter(r => !r.isValid);
      
      if (invalidFiles.length === files.length) {
        observer.error(new Error(
          invalidFiles.map(r => `${r.file.name}: ${r.errors.join(', ')}`).join('; ')
        ));
        return;
      }
      
      // Фильтруем только валидные файлы
      const validFiles = files.filter((_, index) => validationResults[index].isValid);
      processNext();
    });
  }

  /**
   * Генерирует уникальное имя файла
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop() || '';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Получает метаданные EXIF из изображения
   */
  getExifData(file: File): Observable<any> {
    return new Observable<any>(observer => {
      // В реальном приложении можно использовать библиотеку exif-js
      // Здесь просто возвращаем пустой объект для примера
      observer.next({});
      observer.complete();
    });
  }
}