import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { finalize, Subscription, takeUntil } from 'rxjs';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../models/appointment.model';
import { appointmentStatusLabels } from '../../../utils/appointment-ui.utils';
import {
  ManagementAppointmentsService,
  clinicToday,
  isCalendarDate
} from '../../services/management-appointments.service';
import { BaseListComponent } from '../../../components/base-list.component';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { ShowErrorDirective } from '../../../directives/UI/show-error.directive';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { ManagementAppointmentForm } from './management-appointment-detail/management-appointment-form';

@Component({
  standalone: true,
  providers: [NzDrawerService],
  imports: [DatePipe, ReactiveFormsModule, ShareTableComponent, ShowErrorDirective,NzButtonModule, NzIconModule, NzTableModule, NzPaginationModule],
  templateUrl: './management-appointments.html',
  styleUrls: ['../management-ui.css', './management-appointments.css']
})
export class ManagementAppointments extends BaseListComponent<AppointmentHistoryItem> {
  private readonly api = inject(ManagementAppointmentsService);
  protected drawerService = inject(NzDrawerService);
  private request?: Subscription;

  constructor() {
    super();
    this.searchForm = this.fb.group({
      keyword: [null],
      status: [null],
      doctorId: null,
      fromDate: [null],
      toDate: [null],
    })
  }
  override ngOnInit() {
    super.ngOnInit();
  }

  protected override tableColumns: TableColumn[] = [
    {
      title: 'Lịch hẹn',
      key: 'appointmentCode',
      align: 'left',
      width: 180,
      minWidth: 150,
      fixed: 'left',
      visible: true,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Bệnh nhân',
      key: 'patientName',
      align: 'left',
      width: 250,
      minWidth: 200,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Bác sĩ / Dịch vụ',
      key: 'doctorName',
      align: 'left',
      width: 250,
      minWidth: 200,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Ngày, giờ khám',
      key: 'appointmentDate',
      align: 'center',
      width: 180,
      minWidth: 160,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 150,
      minWidth: 130,
      visible: true,
      render: 'text',
      ellipsis: false
    }
  ];

  protected override loadData(): void {
    const body : any ={
      ...this.searchFormValue
    }
    this.request?.unsubscribe();
    this.isLoadingDataSource.set(true);
    this.clearError();
    this.request = this.api.search(this.paramsForSearchLoadData, body)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false)))
      .subscribe(res => {
        this.errorCode.set(String(res.code));
        if (apiResponseSucceeded(res) && res.result) {
          this.dataSource = res.result.content;
          this.total = res.result.totalElements;
        } else {
          this.dataSource = [];
          this.total = 0;
          this.errorMessage.set(res.message || 'Không thể tải danh sách lịch hẹn. Vui lòng thử lại.');
        }
      });
  }

  protected onOpenDetail(id?: number, isViewMode: boolean = false): void {
    let title = 'Thêm mới lịch hẹn';
    if (id) {
      title = isViewMode ? 'Chi tiết lịch hẹn' : 'Chỉnh sửa lịch hẹn';
    }

    this.drawerService.create({
      nzTitle: title,
      nzContent: ManagementAppointmentForm,
      nzWidth: '85vw',
      nzPlacement: 'right',
      nzData: { id, isViewMode },
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' },
    }).afterClose.subscribe((result) => {
      if (result?.success) this.loadData();
    });
  }
}
