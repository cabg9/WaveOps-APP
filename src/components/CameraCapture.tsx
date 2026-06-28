import { useState, useCallback } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  hidePreview?: boolean;
  onCapture: (file: File) => void | Promise<void>;
  taskRequiresPhoto?: boolean;
}

export function CameraCapture({ onCapture, taskRequiresPhoto, hidePreview }: CameraCaptureProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState(0);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setPhotos(prev => [...prev, url]);
    setPhotoCount(prev => prev + 1);
    onCapture(file);
    
    // Reset input para permitir seleccionar la misma foto de nuevo
    e.target.value = '';
  }, [onCapture]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoCount(prev => prev - 1);
  }, []);

  return (
    <div className="space-y-3">
      {/* Input nativo del dispositivo - abre la camara real del celular */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        id="camera-input"
        className="hidden"
      />
      
      <label htmlFor="camera-input">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 cursor-pointer"
          onClick={(e) => {
            // En iOS/Android, el label + click abre la camara nativa
            document.getElementById('camera-input')?.click();
          }}
        >
          <Camera className="w-4 h-4" />
          {photoCount === 0 
            ? (taskRequiresPhoto ? 'Tomar foto obligatoria' : 'Tomar foto') 
            : `Tomar otra foto (${photoCount})`}
        </Button>
      </label>

      {/* Galeria de fotos */}
      {!hidePreview && photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
