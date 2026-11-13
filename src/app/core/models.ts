export interface User {
  usuario_id: number;
  usuario_nombre: string;
  usuario_correo: string;
  usuario_rol: number;
  usuario_preferencias_configuradas: boolean;
}
export interface Artist { artista_id: number; artista_nombre: string; artista_foto_ruta?: string; }
export interface Album { album_id: number; album_nombre: string; artista_album: number; album_portada_ruta?: string; }
export interface Song {
  song_id: number; song_nombre: string; song_artista: number;
  song_genero?: number; song_compositor?: string;
  song_archivo_ruta?: string; song_portada_ruta?: string;
}
export interface Genre { id: number; nombre_genero: string; }
export interface Playlist { playlist_id: number; playlist_nombre: string; playlist_portada_ruta?: string; }
export interface SearchResults { canciones: Song[]; albumes: Album[]; artistas: Artist[]; artistasRelacionados?: Artist[]; }
export interface Recommendations { recomendaciones: { cancion_id: number; score_recomendacion: number }[]; }
export interface RecentSong { song_nombre: string; song_artista: string; song_portada_ruta?: string; }
export function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
