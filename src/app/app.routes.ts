import { Routes } from '@angular/router';
import { sessionGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/landing/landing.page').then(m => m.LandingPage) },
  { path: 'login', title: 'MusicPlay | Iniciar sesión', loadComponent: () => import('./pages/auth/auth.page').then(m => m.AuthPage) },
  { path: 'register', title: 'MusicPlay | Registrarse', data: { register: true }, loadComponent: () => import('./pages/auth/auth.page').then(m => m.AuthPage) },
  { path: 'recuperar', title: 'MusicPlay | Recuperar contraseña', loadComponent: () => import('./pages/auth/recovery.page').then(m => m.RecoveryPage) },
  { path: 'preferencias', title: 'MusicPlay | Preferencias', canActivate: [sessionGuard], data: { memberOnly: true }, loadComponent: () => import('./pages/preferences/preferences.page').then(m => m.PreferencesPage) },
  { path: 'home', canActivate: [sessionGuard], loadComponent: () => import('./layout/music-shell.component').then(m => m.MusicShellComponent), children: [
    { path: '', title: 'MusicPlay | Tu música', loadComponent: () => import('./pages/library/home.page').then(m => m.HomePage) },
    { path: 'buscar', title: 'MusicPlay | Buscar', loadComponent: () => import('./pages/library/search.page').then(m => m.SearchPage) },
    { path: 'recientes', title: 'MusicPlay | Recientes', loadComponent: () => import('./pages/library/collection.page').then(m => m.CollectionPage), data: { type: 'recent' } },
    { path: 'favoritos', title: 'MusicPlay | Favoritos', canActivate: [sessionGuard], data: { type: 'likes', memberOnly: true }, loadComponent: () => import('./pages/library/collection.page').then(m => m.CollectionPage) },
    { path: 'album/:id', loadComponent: () => import('./pages/library/collection.page').then(m => m.CollectionPage), data: { type: 'album' } },
    { path: 'artista/:id', loadComponent: () => import('./pages/library/collection.page').then(m => m.CollectionPage), data: { type: 'artist' } },
    { path: 'cancion/:id', loadComponent: () => import('./pages/library/song.page').then(m => m.SongPage) },
    { path: 'playlist/nueva', canActivate: [sessionGuard], data: { memberOnly: true }, loadComponent: () => import('./pages/library/playlist-form.page').then(m => m.PlaylistFormPage) },
    { path: 'playlist/:id/editar', canActivate: [sessionGuard], data: { memberOnly: true }, loadComponent: () => import('./pages/library/playlist-form.page').then(m => m.PlaylistFormPage) },
    { path: 'playlist/:id', canActivate: [sessionGuard], data: { type: 'playlist', memberOnly: true }, loadComponent: () => import('./pages/library/collection.page').then(m => m.CollectionPage) }
  ] },
  { path: 'admin', title: 'MusicPlay | Administración', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage) },
  // Alias para los nombres de vista anteriores dentro de la navegación con hash.
  ...['index.html', 'page/index.html'].map(path => ({ path, redirectTo: '', pathMatch: 'full' as const })),
  ...['login', 'register', 'home', 'admin', 'preferencias'].flatMap(name => [
    { path: `${name}.html`, redirectTo: name, pathMatch: 'full' as const },
    { path: `page/${name}.html`, redirectTo: name, pathMatch: 'full' as const }
  ]),
  { path: 'camContra.html', redirectTo: 'recuperar' },
  { path: 'page/camContra.html', redirectTo: 'recuperar' },
  { path: '**', redirectTo: '' }
];
