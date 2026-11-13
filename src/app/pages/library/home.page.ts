import { Component, inject, signal, OnInit } from '@angular/core';
import { UI } from '../../shared/ui';
import { SongListComponent } from '../../shared/song-list.component';
import { CatalogService } from '../../core/catalog.service';
import { ApiService } from '../../core/api.service';
import { PlayerService } from '../../core/player.service';
import { SessionService } from '../../core/session.service';
import { Song, Recommendations, message } from '../../core/models';

@Component({ selector: 'app-home', imports: [...UI, SongListComponent], template: `
  @if (loading()) { <p class="empty-state"><ion-spinner /> Cargando música...</p> }
  @if (error()) { <p class="error" role="alert">{{ error() }}</p><ion-button (click)="load()">Reintentar</ion-button> }
  <section class="music-section"><div class="section-header"><h2>Sugerencias</h2><span>{{ suggestions().length }} canciones</span></div>
    @if (session.guest()) { <p class="empty-state">Inicia sesión para ver sugerencias personalizadas.</p> }
    <div class="suggestions-grid">@for (song of suggestions(); track song.song_id; let i = $index) {
      <ion-card button class="suggestion-item" [disabled]="!song.song_archivo_ruta" (click)="player.start(suggestions(), i)"><img [src]="api.asset(song.song_portada_ruta)" alt="" loading="lazy"><ion-card-content><strong>{{ song.song_nombre }}</strong><small>{{ catalog.artistName(song.song_artista) }}</small></ion-card-content></ion-card>
    }</div>
  </section>
  <section class="music-section"><div class="section-header"><h2>Canciones disponibles</h2><span>{{ catalog.songs().length }} canciones</span></div><app-song-list [songs]="catalog.songs()" [wrap]="true" /></section>
  <footer class="site-footer"><span>© {{ year }} MusicPlay</span><img src="assets/logo.svg" alt="MusicPlay" width="40" height="40"><nav><ion-button fill="clear" routerLink="/home">Inicio</ion-button><ion-button fill="clear" routerLink="/home/buscar" [queryParams]="{ tipo: 'artistas' }">Artistas</ion-button><ion-button fill="clear" routerLink="/home/buscar" [queryParams]="{ tipo: 'albumes' }">Álbumes</ion-button><ion-button fill="clear" routerLink="/home/recientes">Reciente</ion-button></nav></footer>
` })
export class HomePage implements OnInit {
  readonly catalog = inject(CatalogService);
  readonly api = inject(ApiService);
  readonly player = inject(PlayerService);
  readonly session = inject(SessionService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly suggestions = signal<Song[]>([]);
  readonly year = new Date().getFullYear();
  async ngOnInit(): Promise<void> { await this.load(); }
  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      await this.catalog.load(); this.player.setFallback(this.catalog.songs());
      const user = this.session.user();
      if (user && !this.session.guest()) {
        try {
          const data = await this.api.request<Recommendations>(`/api/algoritmo/usuarios/${user.usuario_id}/recomendaciones`);
          this.suggestions.set((data.recomendaciones || []).flatMap(rec => {
            const song = this.catalog.songs().find(song => song.song_id === rec.cancion_id); return song ? [song] : [];
          }));
        } catch { /* El catálogo sirve de respaldo cuando el modelo no está disponible. */ }
        if (!this.suggestions().length) this.suggestions.set(this.catalog.songs().filter(song => !!song.song_archivo_ruta).slice(0, 10));
      }
    } catch (error) { this.error.set(message(error)); } finally { this.loading.set(false); }
  }
}
