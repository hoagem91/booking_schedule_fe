import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { ManagementAccessService } from './services/management-access.service';
import { managementHome } from './models/management.models';
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
      { path: 'appointments/review', title: 'Xử lý lịch hẹn | Booking Schedule', data: { heading: 'Xử lý lịch hẹn', permission: 'appointments:update-status' }, loadComponent: () => import('./pages/appointment-review/appointment-review').then(m => m.AppointmentReview) },
      { path: 'appointments', title: 'Quản lý lịch hẹn | Booking Schedule', data: { heading: 'Quản lý lịch hẹn', permission: 'appointments:read' }, loadComponent: () => import('./pages/management-appointments/management-appointments').then(m => m.ManagementAppointments) },
      // { path: 'appointments/:id', title: 'Chi tiết lịch hẹn | Booking Schedule', data: { heading: 'Chi tiết lịch hẹn', permission: 'appointments:read' }, loadComponent: () => import('./pages/management-appointments/management-appointment-form/management-appointment-form').then(m => m.ManagementAppointmentForm) },
      { path: 'doctor-schedule', title: 'Lịch làm việc của bác sĩ| Booking Schedule', data: { heading: 'Lịch làm việc của bác sĩ'}, loadComponent: () => import('./pages/doctor-schedule/doctor-schedule').then(m => m.DoctorSchedule) },
      { path: 'account', title: 'Tài khoản của tôi | Booking Schedule', data: { heading: 'Tài khoản của tôi' }, loadComponent: () => import('./pages/management-account').then(m => m.ManagementAccount) },
      { path: '**', redirectTo: '/404' },
    ],
  },
];
