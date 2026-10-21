import { Component, inject, OnInit } from '@angular/core';
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
export class AdvancedSettingTableComponent implements OnInit {
  private drawerRef = inject(NzDrawerRef<AdvancedSettingTableResult>);
  private drawerData = inject<AdvancedSettingTableData>(NZ_DRAWER_DATA);
  error = '';

  columns: TableColumn[] = [];
  tableKey: string = '';
  defaultColumns: TableColumn[] = [];

  ngOnInit() {
    this.columns = cloneDeep(this.drawerData.columns);
    this.tableKey = this.drawerData.tableKey;
    this.defaultColumns = cloneDeep(this.drawerData.defaultColumns);
    this.columns = this.columns.map(column => ({ ...column, visible: column.visible !== false }));
  }

  onDrop(event: CdkDragDrop<TableColumn[]>) {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
  }

  moveColumn(index: number, offset: number): void {
    const target = index + offset;
    if (target >= 0 && target < this.columns.length) moveItemInArray(this.columns, index, target);
  }

  onSave() {
    if (!this.columns.some(column => column.visible !== false)) {
      this.error = 'Cần giữ ít nhất một cột hiển thị.';
      return;
    }
    if (this.columns.some(column => column.width !== null && (!Number.isFinite(column.width)
      || column.width < (column.minWidth ?? 80) || column.width > Math.max(2000, column.minWidth ?? 80)))) {
      this.error = 'Chiều rộng cột phải nằm trong giới hạn cho phép.';
      return;
    }
    this.drawerRef.close({ columns: cloneDeep(this.columns) });
  }

  onResetDefault() {
    this.drawerRef.close({ reset: true });
  }
}
