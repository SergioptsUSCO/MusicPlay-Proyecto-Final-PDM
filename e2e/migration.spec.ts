import { test, expect, Page } from '@playwright/test';

const artist = { artista_id: 1, artista_nombre: 'Artista de prueba' };
const album = { album_id: 1, album_nombre: 'Álbum de prueba', artista_album: 1 };
const song = { song_id: 1, song_nombre: 'Canción de prueba', song_artista: 1, song_genero: 1, song_compositor: 'Compositor', song_archivo_ruta: '/test-audio.wav' };
const playlist = { playlist_id: 1, playlist_nombre: 'Mi playlist' };
const user = { usuario_id: 1, usuario_nombre: 'Sergio', usuario_rol: 1, usuario_preferencias_configuradas: true };

async function mockApi(page: Page): Promise<void> {
  let likes: number[] = [1];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    let data: unknown = [];
    if (path === '/api/auth/me') data = user;
    else if (path === '/api/auth/login') data = { token: 'test-token' };
    else if (path === '/api/artistas' || path === '/api/tendencias/artistas') data = [artist];
    else if (path === '/api/albumes' || path === '/api/destacados/albumes' || path === '/api/biblioteca/albumes') data = [album];
    else if (path === '/api/canciones' || path === '/api/likes/canciones' || /\/(albumes|playlists)\/1\/canciones$/.test(path)) data = [song];
    else if (path === '/api/likes') data = likes;
    else if (path === '/api/likes/1') { likes = method === 'DELETE' ? [] : [1]; data = {}; }
    else if (path === '/api/playlists') data = method === 'GET' ? [playlist] : playlist;
    else if (path === '/api/playlists/1') data = playlist;
    else if (path === '/api/buscarAlbum/1' || path === '/api/canciones/1/album') data = album;
    else if (path === '/api/buscarCancion/1') data = song;
    else if (path === '/api/generos') data = [{ id: 1, nombre_genero: 'Pop' }];
    else if (path === '/api/buscarGenero/1') data = { id: 1, nombre_genero: 'Pop' };
    else if (path === '/api/recientementeReproducidas') data = [{ song_nombre: song.song_nombre, song_artista: artist.artista_nombre }];
    else if (path.includes('/recomendaciones')) data = { recomendaciones: [{ cancion_id: 1, score_recomendacion: .9 }] };
    else if (path === '/api/busqueda') data = { canciones: [song], artistas: [artist], albumes: [album] };
    await route.fulfill({ json: data, headers: { 'access-control-allow-origin': '*' } });
  });
  // Archivo WAV válido para comprobar el reproductor sin un servidor externo.
  const wav = Buffer.alloc(44 + 16000);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(16000, 40);
  await page.route('**/test-audio.wav', route => route.fulfill({ body: wav, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } }));
}

async function authenticate(page: Page): Promise<void> {
  await page.addInitScript(() => { localStorage.setItem('jwtToken', 'test-token'); });
  if (page.url().startsWith('http://localhost:4200')) await page.evaluate(() => { localStorage.setItem('jwtToken', 'test-token'); });
}

async function expectResponsive(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const viewport = window.innerWidth;
    return [...document.querySelectorAll('h1, h2, .song-row, .auth-card, .collection-header, .player-bar, .admin-panel')]
      .filter(element => element.getClientRects().length)
      .map(element => ({ name: element.className || element.tagName, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.left < -1 || rect.right > viewport + 1).map(({ name }) => name);
  });
  expect(overflow).toEqual([]);
}

for (const width of [360, 768, 1440]) {
  test(`vistas responsivas a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await mockApi(page);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Música para Cada momento' })).toBeVisible(); await expectResponsive(page);
    await page.screenshot({ path: `test-results/landing-${width}.png` });
    await page.goto('/#/login'); await expect(page.getByRole('heading', { name: 'Conéctate...' })).toBeVisible(); await expectResponsive(page);
    await page.goto('/#/register'); await expect(page.getByRole('heading', { name: 'Regístrate...' })).toBeVisible(); await expectResponsive(page);
    await authenticate(page); await page.goto('/#/home');
    await expect(page.getByRole('heading', { name: 'Canciones disponibles' })).toBeVisible();
    await expect(page.locator('.song-row').last()).toContainText(song.song_nombre); await expectResponsive(page);
    await page.screenshot({ path: `test-results/home-${width}.png` });
    await expect(page.locator('.search-button').locator('a')).toHaveCSS('background-color', 'rgb(31, 31, 31)');
    if (width === 360) {
      await page.locator('ion-menu-button').click();
      await expect(page.locator('ion-menu')).toHaveClass(/show-menu/);
      await page.locator('ion-menu').getByRole('link', { name: /Mi playlist/ }).click();
      await expect(page.getByRole('heading', { name: playlist.playlist_nombre, exact: true })).toBeVisible();
      await expect(page.locator('ion-menu')).not.toHaveClass(/show-menu/);
    }
    await page.goto('/#/home/album/1'); await expect(page.getByRole('heading', { name: album.album_nombre })).toBeVisible(); await expectResponsive(page);
    await page.goto('/#/admin'); await expect(page.getByRole('heading', { name: 'Canciones', exact: true })).toBeVisible(); await expectResponsive(page);
    expect(errors).toEqual([]);
  });
}

test('login envía los campos originales y abre la biblioteca', async ({ page }) => {
  await mockApi(page); await page.goto('/#/login');
  await page.locator('ion-input[formControlName="email"] input').fill('sergio@example.com');
  await page.locator('ion-input[formControlName="password"] input').fill('Clave123!');
  const request = page.waitForRequest(request => request.url().endsWith('/api/auth/login'));
  await page.locator('ion-button[type="submit"]').click();
  expect((await request).postDataJSON()).toEqual({ usuario_correo: 'sergio@example.com', usuario_contraseña: 'Clave123!' });
  await expect(page).toHaveURL(/#\/home$/);
});

test('el invitado puede escuchar y buscar, y las funciones personales exigen sesión', async ({ page }) => {
  await mockApi(page); await page.goto('/#/login'); await page.getByRole('button', { name: 'Entrar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Canciones disponibles' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Me gusta', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Buscar', exact: true }).click();
  await page.locator('ion-searchbar input').fill('prueba');
  await expect(page.locator('.catalog-card')).toHaveCount(2);
  await page.goto('/#/home/favoritos'); await expect(page).toHaveURL(/#\/login$/);
});

test('reproduce audio, conserva el reproductor al navegar y actualiza favoritos', async ({ page }) => {
  await mockApi(page); await authenticate(page); await page.goto('/#/home');
  await page.locator('.song-play').click(); await expect(page.locator('.song-info')).toContainText(song.song_nombre);
  await expect(page.locator('.player-progress')).toContainText('0:01');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('link', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('.song-info')).toContainText(song.song_nombre);
  await page.goto('/#/home/favoritos');
  const request = page.waitForRequest(request => request.url().endsWith('/api/likes/1') && request.method() === 'DELETE');
  await page.getByRole('button', { name: 'Quitar de favoritos', exact: true }).click(); await request;
  await expect(page.locator('.song-play')).toHaveCount(0);
});

test('el progreso automático no busca repetidamente dentro del audio', async ({ page }) => {
  await mockApi(page); await authenticate(page);
  await page.addInitScript(() => {
    const state = window as unknown as { playbackSeekWrites: number };
    state.playbackSeekWrites = 0;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!;
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      ...descriptor,
      set(value: number) { state.playbackSeekWrites++; descriptor.set!.call(this, value); }
    });
  });
  const wav = Buffer.alloc(44 + 160000);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(160000, 40);
  await page.route('**/test-audio.wav', route => route.fulfill({ body: wav, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('/#/home'); await page.locator('.song-play').click();
  await expect(page.locator('.player-progress > span').first()).toHaveText('0:02');
  expect(await page.evaluate(() => (window as unknown as { playbackSeekWrites: number }).playbackSeekWrites)).toBe(0);
  const slider = page.getByRole('slider', { name: 'Progreso de reproducción', exact: true });
  await slider.focus(); await slider.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => (window as unknown as { playbackSeekWrites: number }).playbackSeekWrites)).toBe(1);
});

test('código de recuperación y confirmación de contraseña conservan el contrato de API', async ({ page }) => {
  await mockApi(page); await page.goto('/#/recuperar');
  await page.locator('ion-input[formControlName="email"] input').fill('sergio@example.com');
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
  await page.locator('ion-input[formControlName="code"] input').fill('123456');
  await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
  await page.locator('ion-input[formControlName="password"] input').fill('NuevaClave123!');
  await page.locator('ion-input[formControlName="confirm"] input').fill('NuevaClave123!');
  const request = page.waitForRequest(request => request.url().endsWith('/api/auth/reset-password'));
  await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ correo: 'sergio@example.com', codigo: '123456', nuevaContrasena: 'NuevaClave123!' });
  await expect(page.getByRole('heading', { name: 'Todo listo' })).toBeVisible();
});

test('las preferencias bloquean el inicio hasta guardar un artista', async ({ page }) => {
  await mockApi(page); await authenticate(page);
  let configured = false;
  await page.route('**/api/auth/me', route => route.fulfill({ json: { ...user, usuario_preferencias_configuradas: configured }, headers: { 'access-control-allow-origin': '*' } }));
  await page.route('**/api/preferencias/artista-inicial', route => { configured = true; return route.fulfill({ json: {}, headers: { 'access-control-allow-origin': '*' } }); });
  await page.goto('/#/home'); await expect(page).toHaveURL(/#\/preferencias$/);
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  await page.locator('.artist-option').click();
  const request = page.waitForRequest(request => request.url().endsWith('/api/preferencias/artista-inicial'));
  await page.getByRole('button', { name: 'Continuar' }).click();
  expect((await request).postDataJSON()).toEqual({ artista_id: 1 });
  await expect(page.getByRole('heading', { name: 'Canciones disponibles' })).toBeVisible();
});

test('crear y editar playlists conserva el envío multipart', async ({ page }) => {
  await mockApi(page); await authenticate(page); await page.goto('/#/home/playlist/nueva');
  await page.locator('ion-input[formControlName="name"] input').fill('Mis favoritas');
  await page.locator('input[type="file"]').setInputFiles({ name: 'portada.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64') });
  const create = page.waitForRequest(request => request.url().endsWith('/api/playlists') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Crear playlist', exact: true }).click();
  const body = (await create).postDataBuffer()!.toString();
  expect(body).toContain('name="playlist_nombre"'); expect(body).toContain('Mis favoritas'); expect(body).toContain('name="playlist_portada"');
  await expect(page).toHaveURL(/#\/home\/playlist\/1$/);
  await page.goto('/#/home/playlist/1/editar');
  await expect(page.locator('ion-input[formControlName="name"] input')).toHaveValue(playlist.playlist_nombre);
  await page.locator('ion-input[formControlName="name"] input').fill('Nuevo nombre');
  const update = page.waitForRequest(request => request.url().endsWith('/api/playlists/1') && request.method() === 'PUT');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  expect((await update).postDataBuffer()!.toString()).toContain('Nuevo nombre');
});

test('admin edita una canción y conserva los nombres de los campos multipart', async ({ page }) => {
  await mockApi(page); await authenticate(page); await page.goto('/#/admin');
  await page.getByRole('button', { name: 'Editar ' + song.song_nombre, exact: true }).click();
  await expect(page.locator('ion-input[name="name"] input')).toHaveValue(song.song_nombre);
  await page.locator('ion-input[name="name"] input').fill('Canción actualizada');
  const update = page.waitForRequest(request => request.url().endsWith('/api/actualizarCancion/1') && request.method() === 'PUT');
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  const body = (await update).postDataBuffer()!.toString();
  for (const field of ['song_nombre', 'artista_nombre', 'album_nombre', 'song_compositor', 'song_genero']) expect(body).toContain(`name="${field}"`);
  await expect(page.getByRole('status')).toContainText('Registro guardado correctamente.');
});

test('el callback OAuth consume el token antes del guard y lo elimina de la URL', async ({ page }) => {
  await mockApi(page); await page.goto('/?token=test-token');
  await expect(page.getByRole('heading', { name: 'Canciones disponibles' })).toBeVisible();
  await expect(page).toHaveURL(/\/#\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('jwtToken'))).toBe('test-token');
});
