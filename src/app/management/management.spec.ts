import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { ManagementAccessService } from './services/management-access.service';
import { managementGuard } from './management.guard';
import { hasManagementPermission, ManagementUser, managementHome, safeManagementReturnUrl } from './management.models';
import { isCalendarDate, ManagementAppointmentsService } from './services/management-appointments.service';
import { ManagementAppointments } from './pages/management-appointments/management-appointments';
import { NzDrawerService } from 'ng-zorro-antd/drawer';

const user = (roles: string[], status = 'ACTIVE'): ManagementUser => ({
  id: 41, username: 'internal', fullName: 'Nhân viên thử nghiệm', email: null, phone: null,
  status, roles: roles.map((name, index) => ({ id: index + 1, name })),
});

describe('Management appointment request lifecycle', () => {
  class TestAppointments extends ManagementAppointments {
    get rows() { return this.dataSource; }
    get count() { return this.total; }
    get loading() { return this.isLoadingDataSource(); }
    filter(value: Record<string, unknown>) { this.searchForm.patchValue(value); }
  }
  let http: HttpTestingController;
  let component: TestAppointments;
  const url = `${environment.api.baseUrl}/api/admin/appointments/search`;
  const emptyPage = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true, numberOfElements: 0 };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: NzDrawerService, useValue: jasmine.createSpyObj('NzDrawerService', ['create']) },
    ] });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new TestAppointments());
  });
  afterEach(() => { component.ngOnDestroy(); http.verify(); });
  it('loads numeric code/result and sends filters in the body', () => {
    component.filter({ keyword: 'LH-01', status: 'PENDING' });
    component.onBtnSearch();
    const request = http.expectOne(req => req.url === url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.keyword).toBe('LH-01');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.has('keyword')).toBeFalse();
    const item = { id: 1, appointmentCode: 'LH-01' };
    request.flush({ code: 1000, result: { ...emptyPage, content: [item], totalElements: 1 } });
    expect(component.rows[0].appointmentCode).toBe('LH-01');
    expect(component.count).toBe(1);
    expect(component.errorMessage()).toBe('');
    expect(component.errorCode()).toBe('1000');
    expect(component.loading).toBeFalse();
  });
  it('cancels stale requests and only loads the newest filters', () => {
    component.onBtnSearch();
    const old = http.expectOne(req => req.url === url);
    component.filter({ keyword: 'new-query' });
    component.onBtnSearch();
    expect(old.cancelled).toBeTrue();
    const current = http.expectOne(req => req.url === url);
    expect(current.request.body.keyword).toBe('new-query');
    current.flush({ code: 1000, result: emptyPage });
    expect(component.rows).toEqual([]);
    expect(component.loading).toBeFalse();
  });
  it('exposes HTTP failures and clears them on successful retry', () => {
    component.onBtnSearch();
    http.expectOne(req => req.url === url).flush({ code: 9999, message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(component.errorMessage()).toBe('Unavailable');
    expect(component.loading).toBeFalse();
    component.onBtnSearch();
    expect(component.errorMessage()).toBe('');
    http.expectOne(req => req.url === url).flush({ code: 1000, result: emptyPage });
    expect(component.errorCode()).toBe('1000');
    expect(component.rows).toEqual([]);
  });
  it('cancels an outstanding request when the page is destroyed', () => {
    component.onBtnSearch();
    const request = http.expectOne(req => req.url === url);
    component.ngOnDestroy();
    expect(request.cancelled).toBeTrue();
  });
});
describe('Management authorization policy', () => {
  it('allows staff to read appointments and keeps doctors/patients outside that scope', () => {
    expect(hasManagementPermission(user(['STAFF']), 'appointments:read')).toBeTrue();
    expect(hasManagementPermission(user(['ADMIN']), 'appointments:read')).toBeTrue();
    expect(hasManagementPermission(user(['SUPER_ADMIN']), 'appointments:read')).toBeTrue();
    expect(hasManagementPermission(user(['DOCTOR']), 'workspace:view')).toBeTrue();
    expect(hasManagementPermission(user(['DOCTOR']), 'appointments:read')).toBeFalse();
    expect(hasManagementPermission(user(['PATIENT']), 'workspace:view')).toBeFalse();
    expect(hasManagementPermission(user(['ADMIN'], 'INACTIVE'), 'workspace:view')).toBeFalse();
    expect(hasManagementPermission(user(['SCOPE_ADMIN']), 'workspace:view')).toBeFalse();
  });
  it('chooses a role-specific home and supports multiple roles', () => {
    expect(managementHome(user(['STAFF']))).toBe('/management/appointments');
    expect(managementHome(user(['DOCTOR']))).toBe('/management/dashboard');
    expect(managementHome(user(['STAFF', 'ADMIN']))).toBe('/management/dashboard');
    expect(managementHome(user(['PATIENT']))).toBe('/403');
  });
  it('rejects external redirects, login loops and unknown destinations', () => {
    for (const url of ['https://example.org', '//example.org', '/management/login', '/management/access-error', '/management/users', '/management/../login', '/management/appointments/0']) {
      expect(safeManagementReturnUrl(url)).toBeNull();
    }
    expect(safeManagementReturnUrl('/management/appointments/12?page=2')).toBe('/management/appointments/12?page=2');
  });
  it('validates real calendar dates before sending a filter', () => {
    expect(isCalendarDate('2026-02-30')).toBeFalse();
    expect(isCalendarDate('2026-13-01')).toBeFalse();
    expect(isCalendarDate('2028-02-29')).toBeTrue();
  });
});

describe('Management authenticated data and guards', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let access: ManagementAccessService;
  let router: Router;
  const me = `${environment.api.baseUrl}/users/me`;
  const appointments = `${environment.api.baseUrl}/api/admin/appointments/search`;
  const bundle = { token: 'fixture-internal', authenticated: true, expiryTime: '2099-01-01T00:00:00Z', userId: 41, patientId: null };
  beforeEach(() => {
    sessionStorage.removeItem('booking-schedule-auth');
    sessionStorage.removeItem('booking-schedule-auth-area');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService);
    access = TestBed.inject(ManagementAccessService); router = TestBed.inject(Router);
  });
  afterEach(() => { http.verify(); auth.clearAll(); });
  const guard = (permission = 'workspace:view', url = '/management/dashboard') => TestBed.runInInjectionContext(() => managementGuard(
    { data: { permission } } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot,
  ));

  it('redirects anonymous deep links to internal login without reading user data', () => {
    const target = guard('appointments:read', '/management/appointments/12') as UrlTree;
    expect(router.serializeUrl(target)).toBe('/management/login?returnUrl=%2Fmanagement%2Fappointments%2F12');
    http.expectNone(me);
  });
  it('loads backend identity and denies a doctor from the administrative appointments API', () => {
    auth.saveAuthBundle(bundle);
    let target: unknown;
    (guard('appointments:read') as Observable<unknown>).subscribe(value => target = value);
    http.expectOne(me).flush({ code: 1000, result: user(['DOCTOR']) });
    expect(router.serializeUrl(target as UrlTree)).toBe('/403');
    http.expectNone(appointments);
  });
  it('accepts active staff and rechecks roles on the next protected navigation', () => {
    auth.saveAuthBundle(bundle);
    let target: unknown;
    (guard('appointments:read') as Observable<unknown>).subscribe(value => target = value);
    http.expectOne(me).flush({ code: 1000, result: user(['STAFF']) });
    expect(target).toBeTrue();
    (guard('appointments:read') as Observable<unknown>).subscribe(value => target = value);
    http.expectOne(me).flush({ code: 1000, result: user(['DOCTOR']) });
    expect(router.serializeUrl(target as UrlTree)).toBe('/403');
  });
  it('shows a retry destination when identity cannot be verified', () => {
    auth.saveAuthBundle(bundle);
    let target: unknown;
    (guard() as Observable<unknown>).subscribe(value => target = value);
    http.expectOne(me).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(router.serializeUrl(target as UrlTree)).toContain('/management/access-error?returnUrl=');
    expect(access.user()).toBeNull();
  });
  it('discards the previous profile immediately when sessions change and rejects late data', () => {
    auth.saveAuthBundle(bundle);
    access.load().subscribe();
    http.expectOne(me).flush({ code: 1000, result: user(['STAFF']) });
    expect(access.can('appointments:read')).toBeTrue();
    const error = jasmine.createSpy('error');
    access.load(true).subscribe({ error });
    const oldRequest = http.expectOne(me);
    auth.clearAll(); auth.saveAuthBundle({ ...bundle, userId: 99, token: 'new-fixture' });
    expect(access.user()).toBeNull();
    oldRequest.flush({ code: 1000, result: user(['ADMIN']) });
    expect(error).toHaveBeenCalled();
    expect(access.user()).toBeNull();
  });
  it('rejects identity responses that do not belong to the authenticated account', () => {
    auth.saveAuthBundle(bundle);
    const error = jasmine.createSpy('error');
    access.load().subscribe({ error });
    http.expectOne(me).flush({ code: 1000, result: { ...user(['ADMIN']), id: 99 } });
    expect(error).toHaveBeenCalled();
    expect(access.can('workspace:view')).toBeFalse();
  });
  it('discards an outstanding identity response after resetting access for the same user', () => {
    auth.saveAuthBundle(bundle);
    const error = jasmine.createSpy('error');
    access.load().subscribe({ error });
    const previous = http.expectOne(me);
    access.reset();
    access.load().subscribe();
    const current = http.expectOne(me);
    current.flush({ code: 1000, result: user(['DOCTOR']) });
    previous.flush({ code: 1000, result: user(['ADMIN']) });
    expect(error).toHaveBeenCalled();
    expect(access.can('appointments:read')).toBeFalse();
    expect(access.user()?.roles[0].name).toBe('DOCTOR');
  });
  it('keeps internal logout directed to the internal login page', () => {
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    auth.saveAuthBundle(bundle); auth.setLoginArea('management'); auth.forceLogout();
    expect(navigate).toHaveBeenCalledWith('/management/login');
    expect(auth.isAuthenticated()).toBeFalse();
  });
  it('keeps patient logout directed to the patient login page', () => {
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    auth.saveAuthBundle(bundle); auth.forceLogout();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
  it('sends server-side filters and pagination without any invented branch or patient scope', () => {
    TestBed.inject(ManagementAppointmentsService).search({ page: 2, size: 10 }, { keyword: 'LH-01', status: 'PENDING', doctorId: 5, fromDate: '2026-10-19', toDate: '2026-10-20' }).subscribe();
    const request = http.expectOne(req => req.url === appointments);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.body.keyword).toBe('LH-01');
    expect(request.request.body.status).toBe('PENDING');
    expect(request.request.body.doctorId).toBe(5);
    expect(request.request.body.fromDate).toBe('2026-10-19');
    expect(request.request.method).toBe('POST');
    expect(request.request.params.has('patientId')).toBeFalse();
    request.flush({ code: 1000, result: { content: [], totalElements: 0, totalPages: 0, size: 10, number: 2 } });
  });
});


