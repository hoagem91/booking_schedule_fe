import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, computed, contentChild, input } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TableColumn } from '../share-table/share-table.interface';

@Component({
  selector: 'app-share-table-detail',
  standalone: true,
  imports: [NgTemplateOutlet, NzTableModule],
  templateUrl: './share-table-detail.html',
  styleUrl: './share-table-detail.css'
})
export class ShareTableDetail {
  // Luồng dữ liệu: form cha truyền cột, dữ liệu và trạng thái tải xuống; component chỉ hiển thị, không gọi API.
  readonly title = input<string>('');
  readonly columns = input<TableColumn[]>([]);
  readonly dataSource = input<unknown[]>([]);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly emptyText = input<string>('Không có dữ liệu chi tiết.');
  readonly fitContent = input<boolean>(true);
  readonly tableWidth = computed(() => this.columns().reduce(
    (totalWidth, column) => totalWidth + (column.width ?? column.minWidth ?? 80),
    0
  ));

  readonly customCellTemplate = contentChild<TemplateRef<unknown>>('customCell');

  protected getColumnClass(column: TableColumn): string {
    const classes: string[] = [];
    if (column.align) {
      classes.push(`text-${column.align}`);
    }
    if (column.className) {
      classes.push(column.className);
    }
    return classes.join(' ');
  }
}
