import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { ManagementAccessService } from './services/management-access.service';
import { managementHome } from './management.models';
import { managementChildGuard, managementGuard } from './management.guard';

export const managementRoutes: Routes = [
  { path: 'login', title: 'Đăng nhập nội bộ | Booking Schedule', loadComponent: () => import('./pages/login/management-login').then(m => m.ManagementLogin) },
  { path: 'access-error', title: 'Xác minh tài khoản | Booking Schedule', data: { kind: 'recovery' }, loadComponent: () => import('./pages/management-status').then(m => m.ManagementStatus) },
  {
    path: '', canActivate: [managementGuard], canActivateChild: [managementChildGuard],
    loadComponent: () => import('./layout/management-layout').then(m => m.ManagementLayout),
    children: [
      { path: '', pathMatch: 'full', canActivate: [() => inject(Router).parseUrl(managementHome(inject(ManagementAccessService).user()))], loadComponent: () => import('./pages/management-workspace').then(m => m.ManagementWorkspace) },
      { path: 'dashboard', title: 'Không gian làm việc | Booking Schedule', data: { heading: 'Không gian làm việc' }, loadComponent: () => import('./pages/management-workspace').then(m => m.ManagementWorkspace) },
      { path: 'appointments', title: 'Quản lý lịch hẹn | Booking Schedule', data: { heading: 'Quản lý lịch hẹn', permission: 'appointments:read' }, loadComponent: () => import('./pages/management-appointments/management-appointments').then(m => m.ManagementAppointments) },
      // { path: 'appointments/:id', title: 'Chi tiết lịch hẹn | Booking Schedule', data: { heading: 'Chi tiết lịch hẹn', permission: 'appointments:read' }, loadComponent: () => import('./pages/management-appointments/management-appointment-detail/management-appointment-detail').then(m => m.ManagementAppointmentForm) },
      { path: 'account', title: 'Tài khoản của tôi | Booking Schedule', data: { heading: 'Tài khoản của tôi' }, loadComponent: () => import('./pages/management-account').then(m => m.ManagementAccount) },
      { path: '**', redirectTo: '/404' },
    ],
  },
];
