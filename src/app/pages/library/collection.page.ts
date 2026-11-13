import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI } from '../../shared/ui';
import { SongListComponent } from '../../shared/song-list.component';
import { ApiService } from '../../core/api.service';
import { CatalogService } from '../../core/catalog.service';
import { LibraryService } from '../../core/library.service';
import { PlayerService } from '../../core/player.service';
import { SessionService } from '../../core/session.service';
import { DialogService } from '../../core/dialog.service';
import { Song, Album, Playlist, RecentSong, message } from '../../core/models';

interface Collection { type: string; title: string; subtitle: string; cover?: string; songs: Song[]; albums: Album[]; album?: Album; playlist?: Playlist; }
@Component({ selector: 'app-collection', imports: [...UI, SongListComponent], templateUrl: './collection.page.html' })
export class CollectionPage {
  readonly api = inject(ApiService);
  readonly catalog = inject(CatalogService);
  readonly library = inject(LibraryService);
  readonly player = inject(PlayerService);
  readonly session = inject(SessionService);
  private readonly dialogs = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  readonly collection = signal<Collection | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly visibleSongs = computed(() => {
    const collection = this.collection();
    return collection?.type === 'likes' ? collection.songs.filter(song => this.library.likes().includes(song.song_id)) : collection?.songs || [];
  });
  readonly savedAlbum = computed(() => this.library.albums().some(album => album.album_id === this.collection()?.album?.album_id));
  readonly playingCollection = computed(() => this.player.playing() && this.visibleSongs().some(song => song.song_id === this.player.current()?.song_id));
  private requestId = 0;
  constructor() {
    combineLatest([this.route.paramMap, this.route.data]).pipe(takeUntilDestroyed()).subscribe(([params, data]) => { void this.load(data['type'] as string, Number(params.get('id'))); });
  }
  async load(type: string, id: number): Promise<void> {
    const requestId = ++this.requestId; this.loading.set(true); this.error.set(''); this.collection.set(null);
    try {
      await this.catalog.load(); this.player.setFallback(this.catalog.songs());
      let collection: Collection = { type, title: '', subtitle: '', songs: [], albums: [] };
      if (type === 'album') {
        const [album, songs] = await Promise.all([this.api.request<Album>(`/api/buscarAlbum/${id}`), this.api.request<Song[]>(`/api/albumes/${id}/canciones`)]);
        collection = { ...collection, title: album.album_nombre, subtitle: this.catalog.artistName(album.artista_album), cover: album.album_portada_ruta, album, songs };
      } else if (type === 'artist') {
        const artist = this.catalog.artists().find(a => a.artista_id === id);
        if (!artist) throw new Error('Artista no encontrado.');
        collection = { ...collection, title: artist.artista_nombre, cover: artist.artista_foto_ruta, songs: this.catalog.songs().filter(s => s.song_artista === id), albums: this.catalog.albums().filter(a => a.artista_album === id) };
      } else if (type === 'playlist') {
        const [playlist, songs] = await Promise.all([this.api.request<Playlist>(`/api/playlists/${id}`), this.api.request<Song[]>(`/api/playlists/${id}/canciones`)]);
        collection = { ...collection, title: playlist.playlist_nombre, cover: playlist.playlist_portada_ruta, playlist, songs };
      } else {
        const songs = type === 'likes' ? await this.api.request<Song[]>('/api/likes/canciones') :
          (await this.api.request<RecentSong[]>('/api/recientementeReproducidas')).flatMap(recent => {
            const song = this.catalog.songs().find(song => song.song_nombre === recent.song_nombre &&
              (String(song.song_artista) === recent.song_artista || this.catalog.artistName(song.song_artista) === recent.song_artista));
            return song ? [song] : [];
          });
        collection = { ...collection, title: type === 'likes' ? 'Canciones que te gustan' : 'Reproducido recientemente', songs: [...new Map(songs.map(song => [song.song_id, song])).values()] };
      }
      if (requestId === this.requestId) this.collection.set(collection);
    } catch (error) { if (requestId === this.requestId) this.error.set(message(error)); }
    finally { if (requestId === this.requestId) this.loading.set(false); }
  }
  play(): void {
    const ids = this.visibleSongs().map(song => song.song_id);
    if (this.player.current() && ids.includes(this.player.current()!.song_id)) this.player.toggle();
    else this.player.start(this.visibleSongs());
  }
  async remove(song: Song): Promise<void> {
    const playlist = this.collection()?.playlist;
    if (!playlist || !await this.dialogs.confirm('Quitar canción', `¿Quitar «${song.song_nombre}» de esta playlist?`)) return;
    try {
      await this.api.request(`/api/playlists/${playlist.playlist_id}/canciones/${song.song_id}`, 'DELETE');
      this.collection.update(value => value ? { ...value, songs: value.songs.filter(s => s.song_id !== song.song_id) } : value);
    } catch (error) { await this.dialogs.toast(message(error)); }
  }
}
