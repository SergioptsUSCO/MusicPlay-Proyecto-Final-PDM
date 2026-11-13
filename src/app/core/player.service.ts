import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { SessionService } from './session.service';
import { Song } from './models';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly audio = new Audio();
  private queue: Song[] = [];
  private fallback: Song[] = [];
  private index = -1;
  private wrap = true;
  readonly current = signal<Song | null>(null);
  readonly playing = signal(false);
  readonly elapsed = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.8);
  readonly error = signal('');
  readonly durations = signal<Record<number, number>>({});
  private metadataQueue: Song[] = [];
  private requested = new Set<number>();
  private metadataActive = 0;

  constructor() {
    this.audio.preload = 'metadata'; this.audio.volume = this.volume();
    this.audio.addEventListener('play', () => this.playing.set(true));
    this.audio.addEventListener('pause', () => this.playing.set(false));
    this.audio.addEventListener('timeupdate', () => this.elapsed.set(this.audio.currentTime));
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(Number.isFinite(this.audio.duration) ? this.audio.duration : 0);
      const song = this.current();
      if (song) this.durations.update(values => ({ ...values, [song.song_id]: this.audio.duration }));
    });
    this.audio.addEventListener('ended', () => this.adjacent(1));
    this.audio.addEventListener('error', () => { this.error.set('No se pudo reproducir el archivo de audio.'); this.playing.set(false); });
  }
  setFallback(songs: Song[]): void { this.fallback = songs; }
  start(songs: Song[], index = 0, wrap = false): void {
    const chosen = songs[index];
    this.queue = songs.filter(song => !!song.song_archivo_ruta);
    this.index = chosen ? this.queue.findIndex(song => song.song_id === chosen.song_id) : 0;
    if (this.index < 0) this.index = 0;
    this.wrap = wrap; this.playCurrent();
  }
  shuffle(songs: Song[]): void {
    const shuffled = songs.filter(song => !!song.song_archivo_ruta);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.start(shuffled);
  }
  toggle(): void {
    if (!this.current()) { this.start(this.fallback, 0, true); return; }
    if (this.audio.paused) void this.resume(); else this.audio.pause();
  }
  adjacent(direction: number): void {
    if (!this.queue.length) return;
    let next = this.index + direction;
    if (next < 0 || next >= this.queue.length) {
      if (!this.wrap) { if (direction > 0) this.start(this.fallback, 0, true); return; }
      next = (next + this.queue.length) % this.queue.length;
    }
    this.index = next; this.playCurrent();
  }
  seek(percent: number): void { if (this.duration()) this.audio.currentTime = Math.max(0, Math.min(100, percent)) * this.duration() / 100; }
  setVolume(value: number): void { this.volume.set(Math.max(0, Math.min(1, value))); this.audio.volume = this.volume(); }
  stop(): void { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.current.set(null); this.elapsed.set(0); this.duration.set(0); this.error.set(''); this.queue = []; this.fallback = []; }
  private playCurrent(): void {
    const song = this.queue[this.index];
    if (!song?.song_archivo_ruta) return;
    this.error.set(''); this.elapsed.set(0); this.duration.set(0); this.current.set(song);
    this.audio.src = this.api.asset(song.song_archivo_ruta);
    void this.resume();
    if (this.session.authenticated && !this.session.guest()) {
      void this.api.request('/api/reproducciones', 'POST', { cancion_id: song.song_id, duracion_reproduccion: 0 }).catch(() => undefined);
    }
  }
  private async resume(): Promise<void> {
    try { await this.audio.play(); } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) this.error.set('No se pudo iniciar el audio. Pulsa reproducir para reintentar.');
    }
  }
  preload(songs: Song[]): void {
    for (const song of songs) {
      if (!song.song_archivo_ruta || this.requested.has(song.song_id)) continue;
      this.requested.add(song.song_id); this.metadataQueue.push(song);
    }
    this.loadMetadata();
  }
  private loadMetadata(): void {
    while (this.metadataActive < 4 && this.metadataQueue.length) {
      const song = this.metadataQueue.shift()!;
      this.metadataActive++;
      const probe = new Audio();
      let done = false;
      const finish = (): void => {
        if (done) return; done = true; clearTimeout(timer);
        if (Number.isFinite(probe.duration)) this.durations.update(values => ({ ...values, [song.song_id]: probe.duration }));
        probe.removeAttribute('src'); probe.load(); this.metadataActive--; this.loadMetadata();
      };
      const timer = setTimeout(finish, 8000);
      probe.addEventListener('loadedmetadata', finish, { once: true });
      probe.addEventListener('error', finish, { once: true });
      probe.preload = 'metadata'; probe.src = this.api.asset(song.song_archivo_ruta);
    }
  }
}
