// Hook para subir archivos a Firebase Storage
import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase-config';

// ─── Compresión client-side de imágenes (Ronda 6, punto 9c) ───
// Causa de la lentitud: las fotos de cámara/móvil entran tal cual (típicamente
// 3-8 MB, 3000-4000 px) y se subían sin procesar. Aquí se redimensionan a
// máx. 1280 px y se exportan como JPEG calidad 0.8 (~150-400 KB típico).
// Si el archivo no es imagen o falla el procesamiento, se sube tal cual:
// el contrato del hook (File + path -> URL) no cambia.
const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;
const MAX_ORIGINAL_BYTES = 1024 * 1024; // < 1 MB y ya JPEG: se respeta original

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.type === 'image/jpeg' && file.size <= MAX_ORIGINAL_BYTES) {
      bitmap.close();
      return file;
    }
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // no hubo ganancia
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file; // fallback: se sube el archivo original
  }
}

export function useStorageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Subir imagen y obtener URL
  const uploadImage = useCallback(async (
    file: File, 
    path: string
  ): Promise<string> => {
    setUploading(true);
    setProgress(0);
    
    try {
      // Comprimir antes de subir (las fotos de cámara son varios MB)
      const fileToUpload = await compressImage(file);
      console.log('Storage: Subiendo archivo:', fileToUpload.name, 'tamaño:', fileToUpload.size);
      
      // Crear referencia única
      const timestamp = Date.now();
      const fileName = `${timestamp}_${fileToUpload.name}`;
      const fullPath = `${path}/${fileName}`;
      
      console.log('Storage: Ruta:', fullPath);
      
      // Crear referencia en Storage
      const storageRef = ref(storage, fullPath);
      
      // Subir archivo
      console.log('Storage: Iniciando uploadBytes...');
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      console.log('Storage: Archivo subido, metadata:', snapshot.metadata);
      
      // Obtener URL de descarga
      console.log('Storage: Obteniendo downloadURL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Storage: URL obtenida:', downloadURL);
      
      setUploading(false);
      setProgress(100);
      
      return downloadURL;
    } catch (error) {
      console.error('Storage: Error al subir imagen:', error);
      setUploading(false);
      throw error;
    }
  }, []);

  // Subir múltiples imágenes
  const uploadMultipleImages = useCallback(async (
    files: File[],
    path: string
  ): Promise<string[]> => {
    const urls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      setProgress(Math.round((i / files.length) * 100));
      const url = await uploadImage(files[i], path);
      urls.push(url);
    }
    
    setProgress(100);
    return urls;
  }, [uploadImage]);

  return {
    uploadImage,
    uploadMultipleImages,
    uploading,
    progress
  };
}
