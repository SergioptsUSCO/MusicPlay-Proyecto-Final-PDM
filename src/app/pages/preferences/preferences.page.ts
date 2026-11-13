import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UI } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { Artist, message } from '../../core/models';

@Component({ selector: 'app-preferences', host: { class: 'ion-page' }, imports: UI, templateUrl: './preferences.page.html' })
export class PreferencesPage implements OnInit {
  readonly api = inject(ApiService);
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly artists = signal<Artist[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  selected: number | null = null;
  async ngOnInit(): Promise<void> {
    if (this.session.user()?.usuario_preferencias_configuradas) { await this.router.navigateByUrl('/home'); return; }
    try { this.artists.set(await this.api.request<Artist[]>('/api/artistas')); }
    catch (error) { this.error.set(message(error)); } finally { this.loading.set(false); }
  }
  async save(): Promise<void> {
    if (!this.selected || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.api.request('/api/preferencias/artista-inicial', 'POST', { artista_id: this.selected });
      await this.session.goToStart();
    } catch (error) { this.error.set(message(error)); } finally { this.busy.set(false); }
  }
}
