import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { filter } from 'rxjs';
import { UI } from '../shared/ui';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import { SessionService } from '../core/session.service';
import { LibraryService } from '../core/library.service';
import { PlayerService } from '../core/player.service';
import { DialogService } from '../core/dialog.service';
import { formatTime, message } from '../core/models';

@Component({ selector: 'app-music-shell', host: { class: 'ion-page music-layout' }, imports: [...UI, RouterOutlet], templateUrl: './music-shell.component.html' })
export class MusicShellComponent implements OnInit, OnDestroy {
  readonly session = inject(SessionService);
  readonly library = inject(LibraryService);
  readonly player = inject(PlayerService);
  readonly catalog = inject(CatalogService);
  readonly api = inject(ApiService);
  private readonly dialogs = inject(DialogService);
  private readonly menus = inject(MenuController);
  private readonly router = inject(Router);
  readonly time = formatTime;
  private readonly navigation = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => { void this.menus.close('library'); });
  async ngOnInit(): Promise<void> {
    try { await this.library.refresh(); } catch (error) { await this.dialogs.toast(message(error)); }
  }
  logout(): void { this.player.stop(); this.library.clear(); this.session.logout(); }
  ngOnDestroy(): void { this.navigation.unsubscribe(); this.player.stop(); }
}
