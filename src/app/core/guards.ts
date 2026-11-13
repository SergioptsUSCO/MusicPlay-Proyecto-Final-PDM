import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const sessionGuard: CanActivateFn = async (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.guest() && !route.data['memberOnly']) return true;
  if (!session.authenticated) return router.parseUrl('/login');
  try {
    const user = await session.loadUser();
    if (!user.usuario_preferencias_configuradas && route.routeConfig?.path !== 'preferencias') {
      return router.parseUrl('/preferencias');
    }
    return true;
  } catch { session.clear(); return router.parseUrl('/login'); }
};

export const adminGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.authenticated) return router.parseUrl('/login');
  try { return (await session.loadUser()).usuario_rol === 1 || router.parseUrl('/home'); }
  catch { return router.parseUrl('/login'); }
};
