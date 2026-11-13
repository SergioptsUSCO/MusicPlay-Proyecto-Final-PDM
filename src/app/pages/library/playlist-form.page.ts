import { Component, inject, signal, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { LibraryService } from '../../core/library.service';
import { Playlist, message } from '../../core/models';

@Component({ selector: 'app-playlist-form', imports: UI, template: `
  <section class="playlist-form-page"><p class="eyebrow">Tu biblioteca</p><h1>{{ id() ? 'Editar playlist' : 'Crear playlist' }}</h1><p>Ponle nombre y portada a tu playlist.</p>
    <form [formGroup]="form" (ngSubmit)="save()" class="stack playlist-form">
      <img class="playlist-preview" [src]="preview()" alt="Portada de la playlist">
      <label class="file-field">{{ id() ? 'Cambiar foto' : 'Agregar foto' }}<input #coverInput type="file" accept="image/*" (change)="selectFile($event)"></label>
      <ion-input label="Nombre" labelPlacement="stacked" fill="outline" formControlName="name" placeholder="Nombre de la playlist" />
      <p class="error" role="alert">{{ error() }}</p>
      <div class="form-actions"><ion-button class="primary" type="submit" [disabled]="busy() || form.invalid">{{ id() ? 'Guardar cambios' : 'Crear playlist' }}</ion-button><ion-button fill="outline" [routerLink]="id() ? ['/home/playlist', id()] : ['/home']">Cancelar</ion-button></div>
    </form>
  </section>` })
export class PlaylistFormPage implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly library = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly id = signal(0);
  readonly preview = signal('assets/logo.svg');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({ name: ['', [Validators.required, Validators.pattern(/\S/)]] });
  private file?: File;
  private objectUrl?: string;
  @ViewChild('coverInput') private coverInput?: ElementRef<HTMLInputElement>;
  private requestId = 0;
  constructor() { this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => { void this.load(Number(params.get('id'))); }); }
  private async load(id: number): Promise<void> {
    const requestId = ++this.requestId; this.id.set(id); this.form.reset(); this.file = undefined; this.revokePreview(); this.preview.set('assets/logo.svg'); this.error.set('');
    if (this.coverInput) this.coverInput.nativeElement.value = '';
    if (!id) { this.busy.set(false); return; }
    this.busy.set(true);
    try {
      const playlist = await this.api.request<Playlist>(`/api/playlists/${id}`);
      if (requestId === this.requestId) { this.form.patchValue({ name: playlist.playlist_nombre }); this.preview.set(this.api.asset(playlist.playlist_portada_ruta)); }
    } catch (error) { if (requestId === this.requestId) this.error.set(message(error)); }
    finally { if (requestId === this.requestId) this.busy.set(false); }
  }
  selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.error.set('Selecciona una imagen.'); return; }
    this.file = file; this.revokePreview(); this.objectUrl = URL.createObjectURL(file); this.preview.set(this.objectUrl);
  }
  async save(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true); this.error.set('');
    const data = new FormData(); data.append('playlist_nombre', this.form.getRawValue().name.trim());
    if (this.file) data.append('playlist_portada', this.file);
    try {
      const playlist = await this.api.request<Playlist>(this.id() ? `/api/playlists/${this.id()}` : '/api/playlists', this.id() ? 'PUT' : 'POST', data);
      await this.library.refresh(); await this.router.navigate(['/home/playlist', playlist.playlist_id]);
    } catch (error) { this.error.set(message(error)); } finally { this.busy.set(false); }
  }
  private revokePreview(): void { if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = undefined; } }
  ngOnDestroy(): void { this.revokePreview(); }
}
