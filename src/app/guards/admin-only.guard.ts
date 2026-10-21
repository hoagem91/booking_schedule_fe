import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { userProfile$ } from '../store/user-profile.store';
import { filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { UserProfileResponse } from '../models/user-profile.model';
import { UserTypeEnum } from '../enum/user/user.enum';

// Guard để chặn STORE_MANAGER truy cập các route chỉ dành cho ADMIN
export const adminOnlyGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);

  const profile = await firstValueFrom(
    userProfile$.pipe(
      filter((value): value is UserProfileResponse => !!value)
    )
  );

  // Chỉ cho phép ADMIN và SUPERADMIN vào các route này
  if (profile?.type === UserTypeEnum.ADMIN || profile?.type === UserTypeEnum.SUPERADMIN) {
    return true;
  }

  // STORE_MANAGER sẽ bị chuyển hướng về chart-report
  if (profile?.type === UserTypeEnum.STORE_MANAGER) {
    router.navigate(['/report/chart-report']);
    return false;
  }

  // Các user type khác về trang mặc định
  router.navigate(['/']);
  return false;
};

// Guard để chặn STORE_MANAGER truy cập các route không được phép
// STORE_MANAGER chỉ được truy cập: Báo cáo cửa hàng, Đơn hàng, Tồn kho, Điều chuyển, Nhập kho
export const storeManagerRestrictGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);

  const profile = await firstValueFrom(
    userProfile$.pipe(
      filter((value): value is UserProfileResponse => !!value)
    )
  );

  // ADMIN và SUPERADMIN có thể truy cập tất cả
  if (profile?.type === UserTypeEnum.ADMIN || profile?.type === UserTypeEnum.SUPERADMIN) {
    return true;
  }

  // STORE_MANAGER bị chặn, chuyển hướng về trang được phép
  if (profile?.type === UserTypeEnum.STORE_MANAGER) {
    router.navigate(['/report/chart-report']);
    return false;
  }

  // Các user type khác được phép
  return true;
};
