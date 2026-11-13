import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { CatalogService } from '../../core/catalog.service';
import { PlayerService } from '../../core/player.service';
import { LibraryService } from '../../core/library.service';
import { SessionService } from '../../core/session.service';
import { Song, Album, Genre, message } from '../../core/models';

@Component({ selector: 'app-song', imports: UI, template: `
  <ion-button fill="clear" routerLink="/home"><ion-icon name="arrow-back" slot="start" />Volver</ion-button>
  @if (loading()) { <p class="empty-state"><ion-spinner /> Cargando canción...</p> }
  <p class="error" role="alert">{{ error() }}</p>
  @if (song(); as s) {
    <section><div class="collection-header"><img class="collection-cover" [src]="api.asset(s.song_portada_ruta)" alt="Portada"><div><p>Canción</p><h1>{{ s.song_nombre }}</h1><a [routerLink]="['/home/artista', s.song_artista]">{{ catalog.artistName(s.song_artista) }}</a></div></div>
      <div class="collection-actions"><ion-button class="round-play large-play" [disabled]="!s.song_archivo_ruta" (click)="player.start([s])" aria-label="Reproducir"><ion-icon name="play" slot="icon-only" /></ion-button>
        @if (!session.guest()) { <ion-button fill="clear" (click)="library.toggleLike(s.song_id)" [attr.aria-pressed]="library.likes().includes(s.song_id)" aria-label="Me gusta"><ion-icon slot="icon-only" [name]="library.likes().includes(s.song_id) ? 'heart' : 'heart-outline'" /></ion-button> }
      </div>
      <div class="song-detail-grid">
        <ion-card button [routerLink]="['/home/artista', s.song_artista]"><ion-card-content><small>Artista</small><strong>{{ catalog.artistName(s.song_artista) }}</strong></ion-card-content></ion-card>
        <ion-card><ion-card-content><small>Género</small><strong>{{ genre() }}</strong></ion-card-content></ion-card>
        <ion-card button [disabled]="!album()" [routerLink]="album() ? ['/home/album', album()!.album_id] : null"><ion-card-content><small>Álbum</small><strong>{{ album()?.album_nombre || 'Sin álbum' }}</strong></ion-card-content></ion-card>
        <ion-card><ion-card-content><small>Compositor</small><strong>{{ s.song_compositor || 'Sin compositor' }}</strong></ion-card-content></ion-card>
      </div>
    </section>
  }
` })
export class SongPage {
  readonly api = inject(ApiService);
  readonly catalog = inject(CatalogService);
  readonly player = inject(PlayerService);
  readonly library = inject(LibraryService);
  readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  readonly song = signal<Song | null>(null);
  readonly album = signal<Album | null>(null);
  readonly genre = signal('Sin género');
  readonly loading = signal(true);
  readonly error = signal('');
  private requestId = 0;
  constructor() { this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => { void this.load(Number(params.get('id'))); }); }
  private async load(id: number): Promise<void> {
    const requestId = ++this.requestId; this.loading.set(true); this.error.set(''); this.song.set(null); this.album.set(null); this.genre.set('Sin género');
    try {
      await this.catalog.load(); this.player.setFallback(this.catalog.songs());
      const song = await this.api.request<Song>(`/api/buscarCancion/${id}`);
      const [album, genre] = await Promise.all([
        this.api.request<Album | null>(`/api/canciones/${id}/album`).catch(() => null),
        song.song_genero ? this.api.request<Genre>(`/api/buscarGenero/${song.song_genero}`).catch(() => null) : Promise.resolve(null)
      ]);
      if (requestId === this.requestId) { this.song.set(song); this.album.set(album); this.genre.set(genre?.nombre_genero || 'Sin género'); }
    } catch (error) { if (requestId === this.requestId) this.error.set(message(error)); }
    finally { if (requestId === this.requestId) this.loading.set(false); }
  }
}
