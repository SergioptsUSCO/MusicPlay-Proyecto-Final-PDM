import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  async request<T = void>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const token = localStorage.getItem('jwtToken');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    try {
      const text = await firstValueFrom(this.http.request(method, `${this.baseUrl}${path}`, {
        body, headers, responseType: 'text'
      }));
      if (!text) return undefined as T;
      try { return JSON.parse(text) as T; } catch { return text as T; }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        let detail = error.error as unknown;
        if (typeof detail === 'string') {
          try { detail = JSON.parse(detail); } catch { /* La API también devuelve texto. */ }
        }
        const data = detail as { error?: string; message?: string } | null;
        throw new Error(data?.error || data?.message || (typeof detail === 'string' && detail) ||
          (error.status === 0 ? 'No se pudo conectar con el servidor.' : `Error del servidor (${error.status}).`));
      }
      throw error;
    }
  }

  asset(path?: string | null): string {
    if (!path) return 'assets/logo.svg';
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }
}
