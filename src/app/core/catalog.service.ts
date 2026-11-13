import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Song, Artist, Album } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);
  readonly songs = signal<Song[]>([]);
  readonly artists = signal<Artist[]>([]);
  readonly albums = signal<Album[]>([]);
  private loaded = false;
  private pending?: Promise<void>;
  load(force = false): Promise<void> {
    if (this.pending) return this.pending;
    if (this.loaded && !force) return Promise.resolve();
    this.pending = this.fetch().finally(() => { this.pending = undefined; });
    return this.pending;
  }
  private async fetch(): Promise<void> {
    const [songs, artists, albums] = await Promise.all([
      this.api.request<Song[]>('/api/canciones'), this.api.request<Artist[]>('/api/artistas'), this.api.request<Album[]>('/api/albumes')
    ]);
    this.songs.set([...songs].sort((a, b) => a.song_nombre.localeCompare(b.song_nombre, 'es', { sensitivity: 'base' })));
    this.artists.set(artists); this.albums.set(albums); this.loaded = true;
  }
  artistName(id?: number): string { return this.artists().find(a => a.artista_id === id)?.artista_nombre || 'Artista desconocido'; }
}
