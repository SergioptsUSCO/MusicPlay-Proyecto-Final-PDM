import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController } from '@ionic/angular';
import { ApiService } from './api.service';
import { SessionService } from './session.service';
import { DialogService } from './dialog.service';
import { Playlist, Album, message } from './models';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly dialogs = inject(DialogService);
  private readonly sheets = inject(ActionSheetController);
  private readonly router = inject(Router);
  readonly likes = signal<number[]>([]);
  readonly albums = signal<Album[]>([]);
  readonly playlists = signal<Playlist[]>([]);
  readonly busyIds = signal<string[]>([]);
  async refresh(): Promise<void> {
    if (this.session.guest() || !this.session.authenticated) { this.clear(); return; }
    const [likes, albums, playlists] = await Promise.all([
      this.api.request<number[]>('/api/likes'), this.api.request<Album[]>('/api/biblioteca/albumes'), this.api.request<Playlist[]>('/api/playlists')
    ]);
    this.likes.set(likes); this.albums.set(albums); this.playlists.set(playlists);
  }
  clear(): void { this.likes.set([]); this.albums.set([]); this.playlists.set([]); }
  async toggleLike(id: number): Promise<void> {
    await this.mutate(`song:${id}`, async () => {
      const liked = this.likes().includes(id);
      await this.api.request(`/api/likes/${id}`, liked ? 'DELETE' : 'POST');
      this.likes.update(ids => liked ? ids.filter(value => value !== id) : [...ids, id]);
    });
  }
  async toggleAlbum(album: Album): Promise<void> {
    await this.mutate(`album:${album.album_id}`, async () => {
      const saved = this.albums().some(a => a.album_id === album.album_id);
      await this.api.request(`/api/biblioteca/albumes/${album.album_id}`, saved ? 'DELETE' : 'POST');
      this.albums.update(albums => saved ? albums.filter(a => a.album_id !== album.album_id) : [...albums, album]);
    });
  }
  async choosePlaylist(songId: number): Promise<void> {
    try {
      await this.refresh();
      if (!this.playlists().length) {
        await this.dialogs.toast('Crea una playlist para agregar canciones.');
        await this.router.navigateByUrl('/home/playlist/nueva'); return;
      }
      const sheet = await this.sheets.create({ cssClass: 'playlist-options-sheet', header: 'Agregar a playlist', buttons: [
        ...this.playlists().map(p => ({ text: p.playlist_nombre, data: p.playlist_id, role: 'selected' })),
        { text: 'Cancelar', role: 'cancel' }
      ] });
      await sheet.present();
      const result = await sheet.onDidDismiss<number>();
      if (result.role === 'selected' && result.data) {
        await this.api.request(`/api/playlists/${result.data}/canciones/${songId}`, 'POST');
        await this.dialogs.toast('Canción agregada a la playlist.');
      }
    } catch (error) { await this.dialogs.toast(message(error)); }
  }
  async playlistOptions(playlist: Playlist): Promise<void> {
    const sheet = await this.sheets.create({ cssClass: 'playlist-options-sheet', header: playlist.playlist_nombre, buttons: [
      { text: 'Editar playlist', role: 'edit' }, { text: 'Borrar playlist', role: 'delete' }, { text: 'Cancelar', role: 'cancel' }
    ] });
    await sheet.present();
    const { role } = await sheet.onDidDismiss();
    if (role === 'edit') await this.router.navigate(['/home/playlist', playlist.playlist_id, 'editar']);
    if (role === 'delete' && await this.dialogs.confirm('Borrar playlist', '¿Quieres eliminar esta playlist?')) {
      try {
        await this.api.request(`/api/playlists/${playlist.playlist_id}`, 'DELETE');
        await this.refresh(); await this.router.navigateByUrl('/home');
      } catch (error) { await this.dialogs.toast(message(error)); }
    }
  }
  private async mutate(key: string, action: () => Promise<void>): Promise<void> {
    if (this.session.guest() || this.busyIds().includes(key)) return;
    this.busyIds.update(ids => [...ids, key]);
    try { await action(); } catch (error) { await this.dialogs.toast(message(error)); }
    finally { this.busyIds.update(ids => ids.filter(id => id !== key)); }
  }
}
