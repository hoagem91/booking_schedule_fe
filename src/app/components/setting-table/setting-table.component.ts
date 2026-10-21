import { Component, effect, inject, input, model, output } from '@angular/core';
import { TableColumn } from '../share-table/share-table.interface';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { userProfile$ } from '../../store/user-profile.store';
import { TableSettingService } from '../../services/indexeddb/table-setting.service';
import { take } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { AdvancedSettingTableComponent, AdvancedSettingTableData, AdvancedSettingTableResult } from './advanced-setting-table/advanced-setting-table.component';

@Component({
  standalone: true,
  selector: 'app-setting-table',
  templateUrl: './setting-table.component.html',
  styleUrl: './setting-table.component.css',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzPopoverModule,
    NzCheckboxModule,
    NzToolTipModule
  ]
})
export class SettingTableComponent {
  readonly tableKey = input<string>('');
  readonly tableColumnData = model<TableColumn[]>([]);
  tableColumnDataOutput = output<TableColumn[]>();

  private readonly tableSettingService = inject(TableSettingService);
  private readonly drawerService = inject(NzDrawerService);

  popoverVisible = false;
  private defaultColumns: TableColumn[] = [];

  constructor() {
    effect(() => {
      const columns = this.tableColumnData();
      if (columns && columns.length > 0) {
        this.tableColumnDataOutput.emit(columns);
      }
    });
  }

  async ngOnInit() {
    // Lưu cấu hình mặc định trước khi load từ IndexedDB
    this.defaultColumns = cloneDeep(this.tableColumnData());

    userProfile$.subscribe(async userProfile => {
      if (!userProfile) return;
      if (!this.tableKey()) return;
      const setting = await this.tableSettingService.getSetting(userProfile.id, this.tableKey());
      const currentColumns = this.tableColumnData();
      if (setting && setting.columns) {
        const mergedColumns: any[] = [];
        setting.columns.forEach(col => {
          const currentCol = currentColumns.find(c => c.key === col.key);
          if (currentCol) {
            mergedColumns.push({
              ...currentCol,
              visible: col.visible,
              width: col.width,
              fixed: col.fixed
            });
          }
        });

        currentColumns.forEach(c => {
          if (!mergedColumns.find(mc => mc.key === c.key)) {
            mergedColumns.push(c);
          }
        });

        this.tableColumnData.set(mergedColumns);
      }
    });
  }

  onToggleColumn(column: TableColumn, checked: boolean) {
    column.visible = checked;
    this.onChangeColumn();
  }

  onChangeColumn() {
    this.tableColumnDataOutput.emit(this.tableColumnData());
    userProfile$.pipe(take(1)).subscribe(async userProfile => {
      if (!userProfile) return;
      if (!this.tableKey()) return;
      await this.tableSettingService.saveSetting(userProfile.id, this.tableKey(), this.tableColumnData());
    });
  }

  openAdvancedDrawer() {
    this.popoverVisible = false;

    const drawerRef = this.drawerService.create<AdvancedSettingTableComponent, AdvancedSettingTableData, AdvancedSettingTableResult>({
      nzTitle: 'Cài đặt nâng cao',
      nzContent: AdvancedSettingTableComponent,
      nzWidth: 620,
      nzClosable: true,
      nzMaskClosable: true,
      nzData: {
        columns: this.tableColumnData(),
        tableKey: this.tableKey(),
        defaultColumns: this.defaultColumns
      }
    });

    drawerRef.afterClose.subscribe(result => {
      if (!result) return;
      if (result.reset) {
        // Khôi phục về cấu hình mặc định
        this.tableColumnData.set(cloneDeep(this.defaultColumns));
      } else if (result.columns) {
        this.tableColumnData.set(result.columns);
      }
    });
  }
}
