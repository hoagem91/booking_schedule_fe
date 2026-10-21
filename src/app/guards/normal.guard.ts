import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserTypeEnum } from '../enum/user/user.enum';
import { userProfile$ } from '../store/user-profile.store';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { UserProfileResponse } from '../models/user-profile.model';

export const normalRouteGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const profile = await firstValueFrom(
    userProfile$.pipe(
      filter((value): value is UserProfileResponse => !!value)
    )
  );

  if ([UserTypeEnum.CASHIER, UserTypeEnum.RECEPTIONIST, UserTypeEnum.KITCHEN_STAFF].includes(profile!.type!)) {
    router.navigate(['/cashier']);
    return false;
  }
  if(profile!.type === UserTypeEnum.ADMIN) {
    router.navigate(['/overview']);
    return false;
  }
  if(profile!.type === UserTypeEnum.STORE_MANAGER) {
    router.navigate(['/report/chart-report']);
    return false;
  }
  if(profile!.type === UserTypeEnum.REGION_MANAGER) {
    router.navigate(['/overview']);
    return false;
  }
  if(profile!.type === UserTypeEnum.WAREHOUSE) {
    router.navigate(['/warehouse/warehouse']);
    return false;
  }

  return true;
};
