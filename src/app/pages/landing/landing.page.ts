import { Component, inject, signal, OnInit } from '@angular/core';
import { UI } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { Artist, Album, RecentSong, message } from '../../core/models';

@Component({ selector: 'app-landing', host: { class: 'ion-page' }, imports: UI, templateUrl: './landing.page.html' })
export class LandingPage implements OnInit {
  readonly api = inject(ApiService);
  readonly artists = signal<Artist[]>([]);
  readonly albums = signal<Album[]>([]);
  readonly recent = signal<RecentSong[]>([]);
  readonly states = signal<Record<string, string>>({ artists: 'Cargando artistas...', albums: 'Cargando álbumes...', recent: 'Cargando canciones...' });
  readonly year = new Date().getFullYear();
  async ngOnInit(): Promise<void> {
    const results = await Promise.allSettled([
      this.api.request<Artist[]>('/api/tendencias/artistas'), this.api.request<Album[]>('/api/destacados/albumes'), this.api.request<RecentSong[]>('/api/recientementeReproducidas')
    ]);
    const [artists, albums, recent] = results;
    if (artists.status === 'fulfilled') this.artists.set(artists.value);
    if (albums.status === 'fulfilled') this.albums.set(albums.value);
    if (recent.status === 'fulfilled') {
      const seen = new Set<string>();
      this.recent.set(recent.value.filter(song => {
        const key = `${song.song_nombre}::${song.song_artista}`.toLowerCase().trim();
        if (seen.has(key)) return false; seen.add(key); return true;
      }));
    }
    this.states.set(Object.fromEntries(results.map((result, index) => [
      ['artists', 'albums', 'recent'][index], result.status === 'rejected' ? message(result.reason) : 'Todavía no hay elementos disponibles.'
    ])));
  }
  scroll(id: string): void { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
}
