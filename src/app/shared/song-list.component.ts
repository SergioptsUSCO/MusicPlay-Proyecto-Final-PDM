import { Component, input, output, inject, effect } from '@angular/core';
import { UI } from './ui';
import { Song, formatTime } from '../core/models';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import { PlayerService } from '../core/player.service';
import { LibraryService } from '../core/library.service';
import { SessionService } from '../core/session.service';

@Component({ selector: 'app-song-list', imports: UI, template: `
  <div class="song-table" role="list" aria-label="Canciones">
    <div class="song-row song-heading" aria-hidden="true"><span>#</span><span>Título</span><span class="song-artist-column">Artista</span><span>Duración</span></div>
    @for (song of songs(); track song.song_id; let i = $index) {
      <div class="song-row" role="listitem" [class.active]="player.current()?.song_id === song.song_id">
        <span class="song-number">{{ i + 1 }}</span>
        <button class="song-play" [disabled]="!song.song_archivo_ruta" (click)="player.start(songs(), i, wrap())">
          <img [src]="api.asset(song.song_portada_ruta)" alt="" loading="lazy">
          <span><strong>{{ song.song_nombre || 'Sin nombre' }}</strong><small>{{ song.song_archivo_ruta ? catalog.artistName(song.song_artista) : 'Sin archivo de audio' }}</small></span>
        </button>
        <a class="song-artist-column" [routerLink]="['/home/artista', song.song_artista]">{{ catalog.artistName(song.song_artista) }}</a>
        <div class="song-actions"><span class="song-duration">{{ player.durations()[song.song_id] ? time(player.durations()[song.song_id]) : '--:--' }}</span>
          @if (!session.guest()) {
            <ion-button fill="clear" size="small" (click)="library.choosePlaylist(song.song_id)" aria-label="Agregar a playlist"><ion-icon slot="icon-only" name="add" /></ion-button>
            <ion-button fill="clear" size="small" [class.liked]="library.likes().includes(song.song_id)" [disabled]="library.busyIds().includes('song:' + song.song_id)" (click)="library.toggleLike(song.song_id)" [attr.aria-label]="library.likes().includes(song.song_id) ? 'Quitar de favoritos' : 'Me gusta'" [attr.aria-pressed]="library.likes().includes(song.song_id)"><ion-icon slot="icon-only" [name]="library.likes().includes(song.song_id) ? 'heart' : 'heart-outline'" /></ion-button>
          }
          @if (removable()) { <ion-button fill="clear" size="small" (click)="remove.emit(song)" aria-label="Quitar de la playlist"><ion-icon slot="icon-only" name="trash-outline" /></ion-button> }
        </div>
      </div>
    } @empty { <p class="empty-state">{{ emptyMessage() }}</p> }
  </div>` })
export class SongListComponent {
  readonly songs = input.required<Song[]>();
  readonly wrap = input(false);
  readonly removable = input(false);
  readonly emptyMessage = input('Todavía no hay canciones.');
  readonly remove = output<Song>();
  readonly api = inject(ApiService);
  readonly catalog = inject(CatalogService);
  readonly player = inject(PlayerService);
  readonly library = inject(LibraryService);
  readonly session = inject(SessionService);
  readonly time = formatTime;
  constructor() { effect(() => this.player.preload(this.songs())); }
}
