import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { userProfile$, userProfileError$, userProfileLoading$ } from '../store/user-profile.store';
import { combineLatest } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { UserTypeEnum } from '../enum/user/user.enum';
import { AuthService } from '../services/auth.service';
import { UserProfileService } from '../services/user-profile.serivce';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  standalone: true,
  imports: [
    NzSpinModule,
    NzIconModule
  ],
  template: `<div class="w-full h-full flex items-center justify-center">
    <ng-template #indicatorTemplate><nz-icon class="text-4xl" nzType="loading" /></ng-template>
    <nz-spin nzSimple [nzIndicator]="indicatorTemplate"></nz-spin>
  </div>`,
})
export class DefaultRedirectComponent implements OnInit {
  private authService = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  constructor(private router: Router) { }

  ngOnInit() {
    if(!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      console.log('Not authenticated, redirecting to login.');
      return;
    }

    userProfile$.pipe(take(1)).subscribe(profile => {
      if (!profile) {
        this.userProfileService.fetchUserProfile(false);
      }
    });

    combineLatest([userProfile$, userProfileLoading$, userProfileError$])
      .pipe(
        filter(([profile, isLoading, error]) => !!profile || (!!error && !isLoading)),
        take(1)
      )
      .subscribe(([profile]) => {
        if (!profile) {
          this.authService.forceLogout();
          return;
        }

        if ([UserTypeEnum.CASHIER, UserTypeEnum.RECEPTIONIST, UserTypeEnum.KITCHEN_STAFF].includes(profile.type)) {
          this.router.navigate(['/cashier']);
        } else if(profile.type === UserTypeEnum.ADMIN) {
          this.router.navigate(['/overview']);
        } else if(profile.type === UserTypeEnum.STORE_MANAGER) {
          this.router.navigate(['/report/chart-report']);
        } else if(profile.type === UserTypeEnum.REGION_MANAGER) {
          this.router.navigate(['/overview']);
        } else if(profile.type === UserTypeEnum.SUPERADMIN) {
          this.router.navigate(['/company']);
        }
        else if(profile.type === UserTypeEnum.WAREHOUSE) {
          this.router.navigate(['/report-warehouse']);
        }
        else {
          this.router.navigate(['/overview']);
        }
      });
  }
}
