import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI } from '../../shared/ui';
import { SongListComponent } from '../../shared/song-list.component';
import { CatalogService } from '../../core/catalog.service';
import { ApiService } from '../../core/api.service';
import { SearchResults, message } from '../../core/models';

@Component({ selector: 'app-search', imports: [...UI, SongListComponent], templateUrl: './search.page.html' })
export class SearchPage implements OnInit {
  readonly catalog = inject(CatalogService);
  readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly query = signal('');
  readonly type = signal('todos');
  readonly results = signal<SearchResults>({ canciones: [], albumes: [], artistas: [] });
  readonly busy = signal(false);
  readonly error = signal('');
  readonly expanded = signal<string[]>([]);
  private requestId = 0;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.type.set(params.get('tipo') || 'todos');
      if (this.type() !== 'todos') void this.search(this.query());
    });
  }
  async ngOnInit(): Promise<void> {
    try { await this.catalog.load(); } catch (error) { this.error.set(message(error)); }
  }
  async search(query: string): Promise<void> {
    this.query.set(query); this.expanded.set([]); this.error.set('');
    const requestId = ++this.requestId;
    const term = query.trim();
    if (!term && this.type() === 'todos') { this.results.set({ canciones: [], albumes: [], artistas: [] }); this.busy.set(false); return; }
    this.busy.set(true);
    try {
      await this.catalog.load();
      let results: SearchResults;
      if (term) {
        try { results = await this.api.request<SearchResults>(`/api/busqueda?q=${encodeURIComponent(term)}`); }
        catch { results = this.localSearch(term); }
      } else results = this.localSearch('');
      if (requestId === this.requestId) this.results.set(results);
    } catch (error) { if (requestId === this.requestId) this.error.set(message(error)); }
    finally { if (requestId === this.requestId) this.busy.set(false); }
  }
  expand(type: string): void { this.expanded.update(groups => [...groups, type]); }
  private localSearch(term: string): SearchResults {
    const normalized = this.normalize(term);
    const rank = <T>(items: T[], name: (item: T) => string): T[] => items.filter(item => this.normalize(name(item)).includes(normalized)).sort((a, b) => {
      const score = (value: string): number => { const text = this.normalize(value); return text === normalized ? 0 : text.startsWith(normalized) ? 1 : 2; };
      return score(name(a)) - score(name(b));
    });
    return { canciones: rank(this.catalog.songs(), song => song.song_nombre), albumes: rank(this.catalog.albums(), album => album.album_nombre), artistas: rank(this.catalog.artists(), artist => artist.artista_nombre) };
  }
  private normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}
