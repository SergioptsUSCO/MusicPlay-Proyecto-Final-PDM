import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface PhotoSelection { cancelled: boolean; uri?: string; name?: string; mimeType?: string; }
const PhotoAccess = registerPlugin<{ pickPhoto(): Promise<PhotoSelection> }>('PhotoAccess');

@Injectable({ providedIn: 'root' })
export class PhotoAccessService {
  readonly native = Capacitor.getPlatform() === 'android';

  async pickPhoto(): Promise<File | null> {
    const selection = await PhotoAccess.pickPhoto();
    if (selection.cancelled) return null;
    if (!selection.uri) throw new Error('No se pudo acceder a la foto seleccionada.');
    const response = await fetch(Capacitor.convertFileSrc(selection.uri));
    if (!response.ok) throw new Error('No se pudo leer la foto seleccionada. Revisa los permisos.');
    const blob = await response.blob();
    const type = selection.mimeType || blob.type;
    if (!type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
    return new File([blob], selection.name || 'foto', { type });
  }
}
