import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ApiService } from './api.service';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly user = signal<User | null>(null);
  readonly guest = signal(localStorage.getItem('guestMode') === 'true');
  get authenticated(): boolean { return !!localStorage.getItem('jwtToken'); }

  captureOAuth(url: string): boolean {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    const hashQuery = parsed.hash.split('?')[1];
    if (hashQuery) new URLSearchParams(hashQuery).forEach((value, key) => params.set(key, value));
    const token = params.get('token');
    const oauthError = params.get('oauthError');
    if (oauthError) {
      window.history.replaceState({}, '', `${window.location.pathname}#/login?oauthError=${encodeURIComponent(oauthError)}`);
    }
    if (!token) return false;
    localStorage.setItem('jwtToken', token);
    localStorage.removeItem('guestMode');
    this.guest.set(false);
    // Elimina el token de la URL y del historial del navegador.
    window.history.replaceState({}, '', `${window.location.pathname}#/home`);
    return true;
  }

  async loadUser(): Promise<User> {
    const user = await this.api.request<User>('/api/auth/me');
    this.user.set(user);
    return user;
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.api.request<{ token: string }>('/api/auth/login', 'POST', {
      usuario_correo: email.trim(), usuario_contraseña: password
    });
    if (!response.token) throw new Error('El servidor no devolvió una sesión válida.');
    localStorage.setItem('jwtToken', response.token);
    localStorage.removeItem('guestMode');
    this.guest.set(false);
    await this.goToStart();
  }

  async goToStart(): Promise<void> {
    const user = await this.loadUser();
    await this.router.navigateByUrl(user.usuario_preferencias_configuradas ? '/home' : '/preferencias');
  }

  async google(): Promise<void> {
    const url = `${this.api.baseUrl}/oauth2/authorization/google`;
    if (Capacitor.isNativePlatform()) await Browser.open({ url });
    else window.location.assign(url);
  }

  startGuest(): void {
    this.clear();
    localStorage.setItem('guestMode', 'true');
    this.guest.set(true);
    void this.router.navigateByUrl('/home');
  }

  clear(): void {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('guestMode');
    this.user.set(null);
    this.guest.set(false);
  }

  logout(): void { this.clear(); void this.router.navigateByUrl('/login'); }
}
