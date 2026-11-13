import { Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { IonApp, Platform } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { homeOutline, searchOutline, menuOutline, play, pause, playSkipBack, playSkipForward,
  heart, heartOutline, add, shuffle, volumeHighOutline, openOutline, ellipsisHorizontal,
  arrowBack, trashOutline, pencilOutline, musicalNotesOutline, closeOutline } from 'ionicons/icons';
import { SessionService } from './core/session.service';

@Component({ selector: 'app-root', imports: [IonApp, RouterOutlet], template: '<ion-app><router-outlet /></ion-app>' })
export class AppComponent implements OnDestroy {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly platform = inject(Platform);
  private handles: PluginListenerHandle[] = [];
  private backSubscription = this.platform.backButton.subscribeWithPriority(-1, () => {
    if (this.router.url !== '/home' && this.router.url !== '/login' && this.router.url !== '/') window.history.back();
  });
  constructor() {
    addIcons({ homeOutline, searchOutline, menuOutline, play, pause, playSkipBack, playSkipForward,
      heart, heartOutline, add, shuffle, volumeHighOutline, openOutline, ellipsisHorizontal,
      arrowBack, trashOutline, pencilOutline, musicalNotesOutline, closeOutline });
    if (Capacitor.isNativePlatform()) void this.listenForOAuth();
  }
  private async listenForOAuth(): Promise<void> {
    this.handles.push(await App.addListener('appUrlOpen', ({ url }) => { void this.finishOAuth(url); }));
    const launch = await App.getLaunchUrl();
    if (launch?.url) await this.finishOAuth(launch.url);
  }
  private async finishOAuth(url: string): Promise<void> {
    if (!url.startsWith('musicplay://auth/callback')) return;
    await Browser.close().catch(() => undefined);
    if (this.session.captureOAuth(url)) await this.session.goToStart().catch(() => this.session.logout());
    else await this.router.navigate(['/login'], { queryParams: { oauthError: new URL(url).searchParams.get('oauthError') || 'No se pudo completar el acceso.' } });
  }
  ngOnDestroy(): void { this.backSubscription.unsubscribe(); this.handles.forEach(handle => { void handle.remove(); }); }
}
