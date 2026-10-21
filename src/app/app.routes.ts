import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
export const routes: Routes = [
  { path: 'management', loadChildren: () => import('./management/management.routes').then(m => m.managementRoutes) },
  { path: '403', title: 'Không có quyền truy cập | Booking Schedule', data: { kind: 'forbidden' }, loadComponent: () => import('./management/pages/management-status').then(m => m.ManagementStatus) },
  { path: '404', title: 'Không tìm thấy trang | Booking Schedule', loadComponent: () => import('./management/pages/management-status').then(m => m.ManagementStatus) },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'portal', title: 'Cổng thông tin | Booking Schedule', loadComponent: () => import('./pages/portal/portal').then(m => m.Portal) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.Register) },
  { path: 'home', title: 'Đặt lịch khám | Booking Schedule', canActivate: [authGuard], loadComponent: () => import('./pages/appointment-booking/appointment-booking').then(m => m.AppointmentBooking) },
  { path: 'profile', canActivate: [authGuard], canActivateChild: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.Profile), children: [
    { path: '', pathMatch: 'full', title: 'Hồ sơ cá nhân | Booking Schedule', loadComponent: () => import('./pages/profile/profile-detail/profile-details').then(m => m.ProfileDetails) },
    { path: 'appointments', title: 'Lịch sử đặt khám | Booking Schedule', loadComponent: () => import('./pages/appointment-history/appointment-history').then(m => m.AppointmentHistory) },
    { path: 'appointments/:id', title: 'Chi tiết lịch hẹn | Booking Schedule', loadComponent: () => import('./pages/appointment-detail/appointment-detail').then(m => m.AppointmentDetail) },
    { path: 'insurance', title: 'Bảo hiểm y tế | Booking Schedule', data: { section: 'insurance' }, loadComponent: () => import('./pages/profile/profile-detail/profile-details').then(m => m.ProfileDetails) },
  ] },
  { path: '**', redirectTo: '404' },
];
