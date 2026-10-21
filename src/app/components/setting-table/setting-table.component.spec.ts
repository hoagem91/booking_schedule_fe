import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NZ_DRAWER_DATA, NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { Subject } from 'rxjs';
import { TableColumn } from '../share-table/share-table.interface';
import { ManagementUser } from '../../management/management.models';
import { ManagementAccessService } from '../../management/services/management-access.service';
import { mergeTableSettings, TableSettingService } from '../../services/table-settings/table-setting.service';
import { SettingTableComponent } from './setting-table.component';
import { AdvancedSettingTableComponent, AdvancedSettingTableResult } from './advanced-setting-table/advanced-setting-table.component';

const columns = (): TableColumn[] => [
  { key: 'code', title: 'Mã lịch', width: 180, minWidth: 100, align: 'left', visible: true, fixed: 'left', permissions: ['appointments:read'] },
  { key: 'patient', title: 'Bệnh nhân', width: 240, minWidth: 120, align: 'left', visible: true },
];
const user = (id: number): ManagementUser => ({ id, username: `staff${id}`, fullName: 'Nhân viên', email: null, phone: null, status: 'ACTIVE', roles: [{ id: 1, name: 'STAFF' }] });

describe('Table preference schema and browser storage', () => {
  beforeEach(() => TestBed.configureTestingModule({}));
  afterEach(() => {
    for (const id of [701, 702]) for (const key of ['qa-appointments', 'qa-patients']) {
      localStorage.removeItem(`booking-schedule:table-settings:v1:${id}:${key}`);
    }
  });
  it('keeps current schema and permissions while restoring order, width, fixed side and alignment', () => {
    const defaults = columns();
    const result = mergeTableSettings(defaults, [
      { key: 'patient', visible: false, width: 300, align: 'right', fixed: 'right', title: 'Ignored title' },
      { key: 'code', width: 1, permissions: ['ADMIN'] },
      { key: 'deleted' }, { key: 'patient', width: 999 },
    ]);
    expect(result.map(column => column.key)).toEqual(['patient', 'code']);
    expect(result[0]).toEqual(jasmine.objectContaining({ title: 'Bệnh nhân', visible: false, width: 300, align: 'right', fixed: 'right' }));
    expect(result[1].width).toBe(100);
    expect(result[1].permissions).toEqual(['appointments:read']);
    expect(defaults[0].width).toBe(180);
  });
  it('adds new columns, ignores invalid entries and prevents hiding every column', () => {
    const result = mergeTableSettings(columns(), [null, {}, { key: 'code', visible: false, width: Infinity }]);
    expect(result[0].width).toBe(180);
    expect(result[1].key).toBe('patient');
    expect(mergeTableSettings(columns(), [{ key: 'code', visible: false }, { key: 'patient', visible: false }])[0].visible).toBeTrue();
  });
  it('isolates preferences by user and table and persists only presentation fields', () => {
    const service = TestBed.inject(TableSettingService);
    service.saveSetting(701, 'qa-appointments', columns());
    expect(service.getSetting(702, 'qa-appointments')).toBeNull();
    expect(service.getSetting(701, 'qa-patients')).toBeNull();
    const saved = service.getSetting(701, 'qa-appointments') as Record<string, unknown>[];
    expect(Object.keys(saved[0]).sort()).toEqual(['align', 'fixed', 'key', 'visible']);
    service.deleteSetting(701, 'qa-appointments');
    expect(service.getSetting(701, 'qa-appointments')).toBeNull();
  });
  it('does not access localStorage during server rendering', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    TestBed.overrideProvider(DOCUMENT, { useValue: { get defaultView(): never { throw new Error('SSR browser access'); } } });
    const service = TestBed.inject(TableSettingService);
    expect(service.getSetting(701, 'qa-appointments')).toBeNull();
    expect(() => service.saveSetting(701, 'qa-appointments', columns())).not.toThrow();
    expect(() => service.deleteSetting(701, 'qa-appointments')).not.toThrow();
  });
  it('keeps source width changes unless the user customized the current default', () => {
    const service = TestBed.inject(TableSettingService);
    const defaults = columns();
    service.saveSetting(701, 'qa-appointments', defaults, defaults);
    const changed = columns(); changed[0].width = 210;
    expect(mergeTableSettings(changed, service.getSetting(701, 'qa-appointments')!)[0].width).toBe(210);
    const customized = columns(); customized[0].width = 320;
    service.saveSetting(701, 'qa-appointments', customized, defaults);
    expect(mergeTableSettings(defaults, service.getSetting(701, 'qa-appointments')!)[0].width).toBe(320);
    expect(mergeTableSettings(changed, service.getSetting(701, 'qa-appointments')!)[0].width).toBe(210);
  });
  it('migrates v1 snapshots without retaining old default widths', () => {
    localStorage.setItem('booking-schedule:table-settings:v1:701:qa-appointments', JSON.stringify({ version: 1, columns: [{ key: 'patient', width: 999, visible: false, align: 'right' }] }));
    const result = mergeTableSettings(columns(), TestBed.inject(TableSettingService).getSetting(701, 'qa-appointments')!);
    expect(result[0].width).toBe(240);
    expect(result[0].visible).toBeFalse(); expect(result[0].align).toBe('right');
  });
});

describe('SettingTableComponent integration', () => {
  const currentUser = signal<ManagementUser | null>(null);
  let settings: jasmine.SpyObj<TableSettingService>;
  let drawers: jasmine.SpyObj<NzDrawerService>;
  let closed: Subject<AdvancedSettingTableResult | undefined>;
  let close: jasmine.Spy;
  beforeEach(() => {
    currentUser.set(user(701));
    settings = jasmine.createSpyObj('settings', ['getSetting', 'saveSetting', 'deleteSetting']);
    settings.getSetting.and.returnValue(null);
    drawers = jasmine.createSpyObj('drawers', ['create']);
    closed = new Subject(); close = jasmine.createSpy('close');
    drawers.create.and.returnValue({ afterClose: closed.asObservable(), close } as unknown as NzDrawerRef<AdvancedSettingTableResult>);
    TestBed.configureTestingModule({ imports: [SettingTableComponent], providers: [
      { provide: TableSettingService, useValue: settings },
      { provide: ManagementAccessService, useValue: { user: currentUser } },
      { provide: NzDrawerService, useValue: drawers },
    ] });
    // Exercise component state without creating NG-ZORRO overlay DOM.
    TestBed.overrideComponent(SettingTableComponent, { set: { template: '' } });
  });
  async function create() {
    const fixture = TestBed.createComponent(SettingTableComponent);
    fixture.componentRef.setInput('tableKey', 'appointments');
    fixture.componentRef.setInput('tableColumnData', columns());
    fixture.detectChanges(); await fixture.whenStable();
    return fixture;
  }
  it('emits one immutable change and does not loop when the parent echoes it', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    const original = component.tableColumnData();
    const emitted = jasmine.createSpy('emitted');
    component.tableColumnDataOutput.subscribe(value => { emitted(value); fixture.componentRef.setInput('tableColumnData', value); });
    component.onToggleColumn(component.tableColumnData()[1], false);
    fixture.detectChanges(); await fixture.whenStable();
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(original[1].visible).toBeTrue();
    expect(settings.saveSetting).toHaveBeenCalledTimes(1);
    component.onToggleColumn(component.tableColumnData()[0], false);
    expect(emitted).toHaveBeenCalledTimes(1);
  });
  it('restores defaults for a different user and ignores a stale drawer result', async () => {
    settings.getSetting.and.callFake(id => id === 701 ? [{ key: 'patient', visible: false }] : null);
    const fixture = await create(); const component = fixture.componentInstance;
    component.openAdvancedDrawer();
    currentUser.set(user(702));
    // Result arrives before the identity effect has run: the scope check must still reject it.
    closed.next({ columns: [{ ...columns()[0], width: 999 }] });
    expect(settings.saveSetting).not.toHaveBeenCalled();
    fixture.detectChanges(); await fixture.whenStable();
    expect(component.tableColumnData().map(column => column.key)).toEqual(['code', 'patient']);
    expect(component.tableColumnData()[1].visible).toBeTrue();
  });
  it('saves advanced preferences and deletes persistence when restoring defaults', async () => {
    const fixture = await create(); const component = fixture.componentInstance;
    component.openAdvancedDrawer();
    closed.next({ columns: [{ ...columns()[1], width: 350, align: 'right', fixed: 'right' }, columns()[0]] });
    expect(settings.saveSetting).toHaveBeenCalledWith(701, 'appointments', jasmine.any(Array), columns());
    expect(component.tableColumnData()[0].align).toBe('right');
    expect(component.tableColumnData()[0].fixed).toBe('right');
    component.openAdvancedDrawer(); closed.next({ reset: true });
    expect(settings.deleteSetting).toHaveBeenCalledOnceWith(701, 'appointments');
    expect(component.tableColumnData()).toEqual(columns());
  });
  it('keeps changes in memory and explains storage failures', async () => {
    settings.getSetting.and.throwError('storage blocked');
    const fixture = await create(); const component = fixture.componentInstance;
    expect(component.storageError()).toContain('Không thể khôi phục');
    settings.saveSetting.and.throwError('quota');
    component.onToggleColumn(component.tableColumnData()[1], false);
    expect(component.tableColumnData()[1].visible).toBeFalse();
    expect(component.storageError()).toContain('chưa lưu được');
  });
  it('closes its drawer and ignores results after component destruction', async () => {
    const fixture = await create(); fixture.componentInstance.openAdvancedDrawer();
    fixture.destroy(); closed.next({ reset: true });
    expect(close).toHaveBeenCalled();
    expect(settings.deleteSetting).not.toHaveBeenCalled();
  });
});

describe('Advanced settings draft', () => {
  it('does not mutate parent columns and rejects hiding every column', () => {
    const original = columns(); const close = jasmine.createSpy('close');
    TestBed.configureTestingModule({ providers: [
      { provide: NZ_DRAWER_DATA, useValue: { columns: original, defaultColumns: original, tableKey: 'appointments' } },
      { provide: NzDrawerRef, useValue: { close } },
    ] });
    const draft = TestBed.runInInjectionContext(() => new AdvancedSettingTableComponent());
    draft.ngOnInit(); draft.columns.forEach(column => column.visible = false); draft.onSave();
    expect(close).not.toHaveBeenCalled(); expect(draft.error).toContain('ít nhất một cột');
    expect(original[0].visible).toBeTrue();
    draft.columns[0].visible = true; draft.columns[0].width = 20; draft.onSave();
    expect(close).not.toHaveBeenCalled();
    draft.columns[0].width = 200; draft.moveColumn(0, 1); draft.onSave();
    expect(close).toHaveBeenCalledWith({ columns: draft.columns });
  });
});
