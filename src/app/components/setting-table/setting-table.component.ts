import { Component, computed, DestroyRef, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { cloneDeep } from 'lodash-es';
import { take } from 'rxjs';
import { TableColumn } from '../share-table/share-table.interface';
import { ManagementAccessService } from '../../management/services/management-access.service';
import { mergeTableSettings, TableSettingService } from '../../services/table-settings/table-setting.service';
import { AdvancedSettingTableComponent, AdvancedSettingTableData, AdvancedSettingTableResult } from './advanced-setting-table/advanced-setting-table.component';

@Component({
  standalone: true,
  selector: 'app-setting-table',
  templateUrl: './setting-table.component.html',
  styleUrl: './setting-table.component.css',
  imports: [NzButtonModule, NzIconModule, NzPopoverModule, NzCheckboxModule, NzToolTipModule],
})
export class SettingTableComponent {
  readonly tableKey = input('');
  readonly tableColumnData = model<TableColumn[]>([]);
  readonly tableColumnDataOutput = output<TableColumn[]>();
  readonly storageError = signal('');
  readonly visibleCount = computed(() => this.tableColumnData().filter(column => column.visible !== false).length);
  private readonly settings = inject(TableSettingService);
  private readonly access = inject(ManagementAccessService);
  private readonly drawers = inject(NzDrawerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scope = computed(() => {
    const user = this.access.user();
    const key = this.tableKey().trim();
    return user?.status === 'ACTIVE' && user.id > 0 && key ? { userId: user.id, key } : null;
  });
  private defaultColumns: TableColumn[] = [];
  private publishedColumns: TableColumn[] | null = null;
  private activeScope = '';
  private revision = 0;
  private drawer: NzDrawerRef<AdvancedSettingTableResult> | null = null;
  popoverVisible = false;

  constructor() {
    effect(() => {
      const columns = this.tableColumnData();
      const scope = this.scope();
      untracked(() => this.restore(columns, scope));
    });
    this.destroyRef.onDestroy(() => this.drawer?.close());
  }

  private restore(columns: TableColumn[], scope: { userId: number; key: string } | null): void {
    const identity = scope ? JSON.stringify([scope.userId, scope.key]) : '';
    const schemaChanged = columns !== this.publishedColumns;
    if (!schemaChanged && identity === this.activeScope) return;
    // Parent echoing our output is not a new default schema.
    if (schemaChanged) this.defaultColumns = cloneDeep(columns);
    this.activeScope = identity;
    this.revision++;
    this.drawer?.close(); this.drawer = null; this.popoverVisible = false;
    this.storageError.set('');
    let next = mergeTableSettings(this.defaultColumns, []);
    if (scope) {
      try { next = mergeTableSettings(this.defaultColumns, this.settings.getSetting(scope.userId, scope.key) ?? []); }
      catch { this.storageError.set('Không thể khôi phục cài đặt đã lưu. Bảng đang dùng cấu hình mặc định.'); }
    }
    this.publish(next);
  }

  private publish(columns: TableColumn[]): void {
    const snapshot = cloneDeep(columns);
    this.publishedColumns = snapshot;
    this.tableColumnData.set(snapshot);
    this.tableColumnDataOutput.emit(snapshot);
  }

  onToggleColumn(column: TableColumn, checked: boolean): void {
    if (!checked && column.visible !== false && this.visibleCount() <= 1) return;
    if (!this.tableColumnData().some(item => item.key === column.key)) return;
    this.commit(this.tableColumnData().map(item => item.key === column.key ? { ...item, visible: checked } : item));
  }

  onChangeColumn(): void { this.commit(this.tableColumnData()); }

  private commit(columns: TableColumn[], reset = false): void {
    const next = mergeTableSettings(this.defaultColumns, columns);
    this.publish(next);
    this.storageError.set('');
    const scope = this.scope();
    if (!scope) return;
    try {
      if (reset) this.settings.deleteSetting(scope.userId, scope.key);
      else this.settings.saveSetting(scope.userId, scope.key, next, this.defaultColumns);
    } catch {
      this.storageError.set('Đã áp dụng cài đặt cho lần xem này nhưng chưa lưu được trên trình duyệt.');
    }
  }

  openAdvancedDrawer(): void {
    if (this.drawer || !this.tableColumnData().length) return;
    this.popoverVisible = false;
    const revision = this.revision;
    const scope = this.scope();
    const drawer = this.drawers.create<AdvancedSettingTableComponent, AdvancedSettingTableData, AdvancedSettingTableResult>({
      nzTitle: 'Cài đặt cột hiển thị', nzContent: AdvancedSettingTableComponent,
      nzWidth: 'min(720px, 100vw)', nzClosable: true, nzMaskClosable: true,
      nzData: { columns: cloneDeep(this.tableColumnData()), tableKey: this.tableKey(), defaultColumns: cloneDeep(this.defaultColumns) },
    });
    this.drawer = drawer;
    drawer.afterClose.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (this.drawer === drawer) this.drawer = null;
      const current = this.scope();
      if (!result || revision !== this.revision || scope?.userId !== current?.userId || scope?.key !== current?.key) return;
      if (result.reset) this.commit(this.defaultColumns, true);
      else if (result.columns) this.commit(result.columns);
    });
  }
}
