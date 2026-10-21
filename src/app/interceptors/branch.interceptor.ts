import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { userStore } from '../store/user-profile.store';
import { BranchContextService } from '../services/context/branch-context.service';
import { throwError, of } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';

export const BranchInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  if (!req.body || typeof req.body !== 'object' || !('branchId' in req.body)) {
    return next(req);
  }

  const branchCtx = inject(BranchContextService);

  return userStore.pipe(
    filter(state => !!state.profile),
    take(1),
    switchMap(state => {
      const profile = state.profile;

      if (profile?.type === 'SUPERADMIN') {
        return next(req);
      }

      if (req.body.branchId === null) {
        let branchId = branchCtx.getBranch();

        if (profile) {
          if (profile.type === 'STORE_MANAGER' || profile.type === 'ADMIN' || profile.type === 'RECEPTIONIST' || profile.type === 'CASHIER') {
            branchId = profile.branchId;
          }

          if (profile.type === 'ADMIN') {
            if (!branchId) {
              // return throwError(() => new Error('ADMIN chưa chọn chi nhánh.'));
            }
          }
        }

        const newReq = req.clone({
          body: { ...req.body, branchId }
        });

        return next(newReq);
      }

      return next(req);
    })
  );
};
