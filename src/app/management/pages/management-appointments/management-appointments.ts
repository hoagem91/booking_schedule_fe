import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { finalize, Subscription, takeUntil } from 'rxjs';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../models/appointment.model';
import { appointmentStatusLabels } from '../../../utils/appointment/appointment-ui.utils';
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
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { NzTagComponent } from 'ng-zorro-antd/tag';
import { AppointmentUtils } from '../../../utils/appointment/appointment.utils';
import { ShareButton } from '../../../components/share-button/share-button';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  standalone: true,
  providers: [NzDrawerService],
  imports: [DatePipe, ReactiveFormsModule, ShareTableComponent, ShowErrorDirective, NzButtonModule, NzIconModule, NzTableModule, NzPaginationModule, NzTooltipDirective, NzTagComponent, ShareButton, SettingTableComponent, NzInputModule],
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
      title: 'Mã lịch hẹn',
      key: 'appointmentCode',
      align: 'left',
      width: 220,
      minWidth: 180,
      fixed: 'left',
      visible: true,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Bệnh nhân',
      key: 'patientName',
      align: 'left',
      width: 180,
      minWidth: 160,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Mã bệnh nhân',
      key: 'patientCode',
      align: 'left',
      width: 190,
      minWidth: 160,
      visible: false,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Số điện thoại',
      key: 'patientPhone',
      align: 'left',
      width: 160,
      minWidth: 140,
      visible: true,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Bác sĩ / Dịch vụ',
      key: 'doctorName',
      align: 'left',
      width: 180,
      minWidth: 160,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Mã bác sĩ',
      key: 'doctorCode',
      align: 'left',
      width: 190,
      minWidth: 160,
      visible: false,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Dịch vụ khám',
      key: 'serviceName',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: false,
      render: 'text'
    },
    {
      title: 'Ngày, giờ khám',
      key: 'appointmentDate',
      align: 'center',
      width: 160,
      minWidth: 140,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Giờ bắt đầu',
      key: 'startTime',
      align: 'center',
      width: 140,
      minWidth: 120,
      visible: false,
      render: 'text'
    },
    {
      title: 'Giờ kết thúc',
      key: 'endTime',
      align: 'center',
      width: 140,
      minWidth: 120,
      visible: false,
      render: 'text'
    },
    {
      title: 'Giá dịch vụ',
      key: 'servicePrice',
      align: 'right',
      width: 140,
      minWidth: 120,
      visible: true,
      render: 'text',
      pipeName: 'displayCurrency'
    },
    {
      title: 'Thành tiền',
      key: 'finalAmount',
      align: 'right',
      width: 140,
      minWidth: 120,
      visible: true,
      render: 'text',
      pipeName: 'displayCurrency'
    },
    {
      title: 'Mã khuyến mãi',
      key: 'promotionCode',
      align: 'left',
      width: 180,
      minWidth: 150,
      visible: false,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Tên khuyến mãi',
      key: 'promotionName',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: false,
      render: 'text'
    },
    {
      title: 'Loại giảm giá',
      key: 'discountType',
      align: 'center',
      width: 160,
      minWidth: 140,
      visible: false,
      render: 'text'
    },
    {
      title: 'Giá trị giảm',
      key: 'discountValue',
      align: 'right',
      width: 160,
      minWidth: 140,
      visible: false,
      render: 'text'
    },
    {
      title: 'Giảm tối đa',
      key: 'maxDiscount',
      align: 'right',
      width: 160,
      minWidth: 140,
      visible: false,
      render: 'text',
      pipeName: 'displayCurrency'
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 150,
      minWidth: 130,
      visible: true,
      render: 'custom',
      ellipsis: false
    },
    {
      title: 'Đủ điều kiện đánh giá',
      key: 'reviewEligible',
      align: 'center',
      width: 190,
      minWidth: 160,
      visible: false,
      render: 'custom'
    },
    {
      title: 'Lý do',
      key: 'reason',
      align: 'left',
      width: 250,
      minWidth: 180,
      visible: false,
      render: 'text'
    },
    {
      title: 'Ghi chú',
      key: 'note',
      align: 'left',
      width: 250,
      minWidth: 180,
      visible: false,
      render: 'text'
    },
    {
      title: 'Ngày đặt lịch',
      key: 'createdAt',
      align: 'center',
      width: 140,
      minWidth: 120,
      visible: true,
      render: 'text',
      pipeName: 'dateDisplay'
    },
    {
      title: 'Ngày cập nhật',
      key: 'updatedAt',
      align: 'center',
      width: 190,
      minWidth: 160,
      visible: false,
      render: 'text',
      pipeName: 'dateDisplay'
    },
    {
      title: 'Chức năng',
      key: 'actions',
      align: 'center',
      width: 130,
      minWidth: 110,
      fixed: 'right',
      visible: true,
      render: 'actions'
    }
  ];

  protected override loadData(): void {
    const body : any ={
      ...this.searchForm.value,
      keyword: this.searchForm.controls['keyword'].value?.trim() || null,
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

  protected readonly AppointmentUtils = AppointmentUtils;
}
