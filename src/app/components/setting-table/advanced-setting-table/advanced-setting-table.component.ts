import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { TableColumn } from '../../share-table/share-table.interface';
import { TableSettingService } from '../../../services/indexeddb/table-setting.service';
import { userProfile$ } from '../../../store/user-profile.store';
import { take } from 'rxjs';
import { cloneDeep } from 'lodash-es';

export interface AdvancedSettingTableData {
  columns: TableColumn[];
  tableKey: string;
  defaultColumns: TableColumn[];
}

export interface AdvancedSettingTableResult {
  columns?: TableColumn[];
  reset?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-advanced-setting-table',
  templateUrl: './advanced-setting-table.component.html',
  styleUrl: './advanced-setting-table.component.css',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    NzCheckboxModule,
    NzInputNumberModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzToolTipModule,
    NzPopconfirmModule
  ]
})
export class AdvancedSettingTableComponent {
  private drawerRef = inject(NzDrawerRef<AdvancedSettingTableResult>);
  private drawerData = inject<AdvancedSettingTableData>(NZ_DRAWER_DATA);
  private tableSettingService = inject(TableSettingService);

  columns: TableColumn[] = [];
  tableKey: string = '';
  defaultColumns: TableColumn[] = [];

  ngOnInit() {
    this.columns = cloneDeep(this.drawerData.columns);
    this.tableKey = this.drawerData.tableKey;
    this.defaultColumns = this.drawerData.defaultColumns;
  }

  onDrop(event: CdkDragDrop<TableColumn[]>) {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
  }

  onSave() {
    userProfile$.pipe(take(1)).subscribe(async userProfile => {
      if (!userProfile) return;
      if (!this.tableKey) return;
      await this.tableSettingService.saveSetting(userProfile.id, this.tableKey, this.columns);
      this.drawerRef.close({ columns: this.columns });
    });
  }

  onResetDefault() {
    userProfile$.pipe(take(1)).subscribe(async userProfile => {
      if (!userProfile) return;
      if (!this.tableKey) return;
      await this.tableSettingService.deleteSetting(userProfile.id, this.tableKey);
      this.drawerRef.close({ reset: true });
    });
  }
}
