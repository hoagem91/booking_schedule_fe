import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { EmployeeConstants } from '../../constants/hrm/employee.constants';
import { EmployeeState } from '../../enum/hrm/employees.enum';
import { EmployeeItemResponseList } from '../../models/employee/employees.model';

@Component({
  standalone: true,
  selector: 'app-share-gridview',
  templateUrl: './share-gridview.html',
  styleUrl: './share-gridview.css',
  imports: [NzAvatarModule, NzEmptyModule, NzIconModule, NzPaginationModule, NzSpinModule]
})
export class ShareGridview {
  @Input() employees: EmployeeItemResponseList[] = [];
  @Input() loading = false;
  @Input() total = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 20;
  @Output() currentPageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  protected readonly EmployeeState = EmployeeState;

  protected getStateText(state: string): string {
    return EmployeeConstants.ListEmployeeState.find(item => item.value === state)?.text || state || '-';
  }
}
