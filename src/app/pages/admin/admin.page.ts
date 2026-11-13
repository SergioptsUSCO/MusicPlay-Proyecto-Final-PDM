import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UI } from '../../shared/ui';
import { CatalogService } from '../../core/catalog.service';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../core/dialog.service';
import { Song, Genre, Album, message } from '../../core/models';

type Kind = 'song' | 'artist' | 'album' | 'genre';
interface AdminRow { id: number; name: string; image?: string; artist?: string; genre?: string; audio?: boolean; }
interface Draft { name: string; artist: string; album: string; composer: string; genre: number | null; }
@Component({ selector: 'app-admin', host: { class: 'ion-page' }, imports: UI, templateUrl: './admin.page.html' })
export class AdminPage implements OnInit {
  readonly api = inject(ApiService);
  readonly catalog = inject(CatalogService);
  private readonly dialogs = inject(DialogService);
  readonly kind = signal<Kind>('song');
  readonly genres = signal<Genre[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly status = signal('');
  readonly editingId = signal(0);
  readonly labels: Record<Kind, string> = { song: 'Canciones', artist: 'Artistas', album: 'Álbumes', genre: 'Géneros' };
  draft: Draft = this.emptyDraft();
  private files: { primary?: File; cover?: File } = {};
  @ViewChild('entityForm') private form?: NgForm;
  @ViewChild('primaryFile') private primaryFile?: ElementRef<HTMLInputElement>;
  @ViewChild('coverFile') private coverFile?: ElementRef<HTMLInputElement>;
  readonly rows = computed<AdminRow[]>(() => {
    switch (this.kind()) {
      case 'song': return this.catalog.songs().map(song => ({ id: song.song_id, name: song.song_nombre, image: song.song_portada_ruta, artist: this.catalog.artistName(song.song_artista), genre: this.genres().find(g => g.id === song.song_genero)?.nombre_genero || 'Sin género', audio: !!song.song_archivo_ruta }));
      case 'artist': return this.catalog.artists().map(artist => ({ id: artist.artista_id, name: artist.artista_nombre, image: artist.artista_foto_ruta }));
      case 'album': return this.catalog.albums().map(album => ({ id: album.album_id, name: album.album_nombre, image: album.album_portada_ruta, artist: this.catalog.artistName(album.artista_album) }));
      case 'genre': return this.genres().map(genre => ({ id: genre.id, name: genre.nombre_genero }));
    }
  });
  async ngOnInit(): Promise<void> { await this.refresh(); }
  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [, genres] = await Promise.all([this.catalog.load(true), this.api.request<Genre[]>('/api/generos')]);
      this.genres.set(genres);
    } catch (error) { this.error.set(message(error)); } finally { this.loading.set(false); }
  }
  setKind(value: string | number | undefined): void {
    if (!['song', 'artist', 'album', 'genre'].includes(String(value))) return;
    this.kind.set(value as Kind); this.reset();
  }
  get availableAlbums(): Album[] {
    const artist = this.catalog.artists().find(artist => artist.artista_nombre === this.draft.artist);
    return this.catalog.albums().filter(album => album.artista_album === artist?.artista_id);
  }
  private emptyDraft(): Draft { return { name: '', artist: '', album: '', composer: '', genre: null }; }
  reset(): void {
    this.editingId.set(0); this.draft = this.emptyDraft(); this.files = {}; this.error.set(''); this.status.set('');
    this.form?.resetForm(this.draft); this.clearFileInputs();
  }
  selectFile(event: Event, key: 'primary' | 'cover'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.files[key] = file; else delete this.files[key];
  }
  async edit(row: AdminRow): Promise<void> {
    this.reset(); this.editingId.set(row.id); this.draft.name = row.name;
    if (this.kind() === 'song') {
      const song = this.catalog.songs().find(song => song.song_id === row.id)!;
      this.draft.artist = this.catalog.artistName(song.song_artista); this.draft.composer = song.song_compositor || ''; this.draft.genre = song.song_genero || null;
      this.busy.set(true);
      try { this.draft.album = (await this.api.request<Album | null>(`/api/canciones/${song.song_id}/album`))?.album_nombre || ''; }
      catch { this.draft.album = ''; } finally { this.busy.set(false); }
    } else if (this.kind() === 'album') {
      this.draft.artist = this.catalog.artistName(this.catalog.albums().find(album => album.album_id === row.id)!.artista_album);
    }
    this.status.set(`Editando ${row.name}.`);
    document.getElementById('admin-editor')?.scrollIntoView({ behavior: 'smooth' });
  }
  async save(): Promise<void> {
    if (this.form?.invalid || !this.draft.name.trim() || this.busy()) { this.error.set('Completa los campos obligatorios.'); return; }
    this.busy.set(true); this.error.set(''); this.status.set('');
    const id = this.editingId();
    const entity = { song: 'Cancion', artist: 'Artista', album: 'Album', genre: 'Genero' }[this.kind()];
    const data = new FormData();
    if (this.kind() === 'song') {
      data.append('song_nombre', this.draft.name.trim()); data.append('artista_nombre', this.draft.artist);
      data.append('album_nombre', this.draft.album); data.append('song_compositor', this.draft.composer.trim());
      data.append('song_genero', String(this.draft.genre || ''));
      if (this.files.primary) data.append('archivoCancion', this.files.primary);
      if (this.files.cover) data.append('portadaCancion', this.files.cover);
    } else if (this.kind() === 'artist') {
      data.append('artista_nombre', this.draft.name.trim()); if (this.files.primary) data.append('fotoArtista', this.files.primary);
    } else if (this.kind() === 'album') {
      data.append('album_nombre', this.draft.name.trim()); data.append('artista_nombre', this.draft.artist);
      if (this.files.primary) data.append('portadaAlbum', this.files.primary);
    } else data.append('nombre_genero', this.draft.name.trim());
    try {
      await this.api.request(`/api/${id ? 'actualizar' : 'crear'}${entity}${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', data);
      this.reset(); this.status.set('Registro guardado correctamente.'); await this.refresh();
    } catch (error) { this.error.set(message(error)); } finally { this.busy.set(false); }
  }
  async remove(row: AdminRow): Promise<void> {
    if (!await this.dialogs.confirm('Eliminar registro', `¿Quieres eliminar «${row.name}»?`)) return;
    this.busy.set(true); this.error.set('');
    const entity = { song: 'Cancion', artist: 'Artista', album: 'Album', genre: 'Genero' }[this.kind()];
    try { await this.api.request(`/api/eliminar${entity}/${row.id}`, 'DELETE'); this.reset(); await this.refresh(); this.status.set('Registro eliminado.'); }
    catch (error) { this.error.set(message(error)); } finally { this.busy.set(false); }
  }
  private clearFileInputs(): void {
    if (this.primaryFile) this.primaryFile.nativeElement.value = '';
    if (this.coverFile) this.coverFile.nativeElement.value = '';
  }
}
