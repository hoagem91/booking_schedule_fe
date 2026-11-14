import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ManagementAccessService } from './services/management-access.service';
import { hasManagementPermission, ManagementPermission } from './models/management.models';

export const managementGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const access = inject(ManagementAccessService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/management/login'], { queryParams: { returnUrl: state.url } });
  const permission: ManagementPermission = route.data['permission'] ?? 'workspace:view';
  // The parent guard loads the signed-in user once. Child guards reuse that
  // session snapshot so navigating between management pages does not refetch /users/me.
  return access.load().pipe(
    map(user => {
      if (!hasManagementPermission(user, permission)) return router.createUrlTree(['/403']);
      auth.setLoginArea('management');
      return true;
    }),
    catchError(() => of(auth.isAuthenticated()
      ? router.createUrlTree(['/management/access-error'], { queryParams: { returnUrl: state.url } })
      : router.createUrlTree(['/management/login'], { queryParams: { returnUrl: state.url } }))),
  );
};

export const managementChildGuard: CanActivateChildFn = (route, state) => {
  const auth = inject(AuthService);
  const access = inject(ManagementAccessService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/management/login'], { queryParams: { returnUrl: state.url } });

  const permission: ManagementPermission = route.data['permission'] ?? 'workspace:view';
  return access.load().pipe(
    map(user => {
      if (!hasManagementPermission(user, permission)) return router.createUrlTree(['/403']);
      auth.setLoginArea('management');
      return true;
    }),
    catchError(() => of(auth.isAuthenticated()
      ? router.createUrlTree(['/management/access-error'], { queryParams: { returnUrl: state.url } })
      : router.createUrlTree(['/management/login'], { queryParams: { returnUrl: state.url } }))),
  );
};
