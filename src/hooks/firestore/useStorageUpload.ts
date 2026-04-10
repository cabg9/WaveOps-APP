// Hook para subir archivos a Firebase Storage
import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase-config';

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
      console.log('Storage: Subiendo archivo:', file.name, 'tamaño:', file.size);
      
      // Crear referencia única
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const fullPath = `${path}/${fileName}`;
      
      console.log('Storage: Ruta:', fullPath);
      
      // Crear referencia en Storage
      const storageRef = ref(storage, fullPath);
      
      // Subir archivo
      console.log('Storage: Iniciando uploadBytes...');
      const snapshot = await uploadBytes(storageRef, file);
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
