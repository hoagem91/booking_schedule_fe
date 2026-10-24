import { Component, inject } from '@angular/core';
import { BaseListComponent } from '../../../components/base-list.component';
import { DoctorScheduleAdminService } from '../../services/admin-doctor-schedule.service';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { takeUntil } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import {
  ManagementAppointmentForm
} from '../management-appointments/management-appointment-form/management-appointment-form';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputDirective, NzInputGroupComponent, NzInputGroupWhitSuffixOrPrefixDirective } from 'ng-zorro-antd/input';
import { NzWaveDirective } from 'ng-zorro-antd/core/wave';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { ShareButton } from '../../../components/share-button/share-button';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { ShowErrorDirective } from '../../../directives/UI/show-error.directive';
import { NzTagComponent } from 'ng-zorro-antd/tag';
import { DoctorScheduleUtils } from '../../../utils/appointment/doctor-schedule.utils';
import { DoctorScheduleResponse } from '../../models/doctor-schedule.models';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { DoctorScheduleForm } from './doctor-schedule-form/doctor-schedule-form';
import { DoctorScheduleDetail } from './doctor-schedule-detail/doctor-schedule-detail';

@Component({
  selector: 'app-doctor-schedule',
  imports: [
    FormsModule,
    NzInputDirective,
    NzInputGroupComponent,
    NzInputGroupWhitSuffixOrPrefixDirective,
    NzWaveDirective,
    ReactiveFormsModule,
    SettingTableComponent,
    ShareButton,
    ShareTableComponent,
    ShowErrorDirective,
    NzTagComponent,
    NzTooltipModule,
    NzIconModule,
    NzButtonModule
  ],
  templateUrl: './doctor-schedule.html',
  styleUrl: './doctor-schedule.css',
})
export class DoctorSchedule extends BaseListComponent{
  protected doctorScheduleService = inject(DoctorScheduleAdminService);
  protected drawerService = inject(NzDrawerService);
  protected notification = inject(NzNotificationService);
  protected nzModalService = inject(NzModalService);
  protected readonly DoctorScheduleUtils = DoctorScheduleUtils;

  protected override tableColumns: TableColumn[] = [
    {
      title: 'Mã bác sĩ',
      key: 'doctorCode',
      align: 'left',
      width: 180,
      minWidth: 150,
      visible: true,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Tên bác sĩ',
      key: 'doctorName',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: true,
      render: 'text'
    },
    {
      title: 'Chuyên khoa',
      key: 'specialtyName',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: true,
      render: 'text'
    },
    {
      title: 'Mã phòng khám',
      key: 'roomCode',
      align: 'left',
      width: 180,
      minWidth: 150,
      visible: false,
      render: 'text'
    },
    {
      title: 'Phòng khám',
      key: 'roomName',
      align: 'left',
      width: 250,
      minWidth: 180,
      visible: true,
      render: 'text'
    },
    {
      title: 'Ngày làm việc',
      key: 'workDate',
      align: 'center',
      width: 170,
      minWidth: 150,
      visible: true,
      render: 'text'
    },
    {
      title: 'Giờ bắt đầu',
      key: 'startTime',
      align: 'center',
      width: 150,
      minWidth: 120,
      visible: true,
      render: 'text'
    },
    {
      title: 'Giờ kết thúc',
      key: 'endTime',
      align: 'center',
      width: 150,
      minWidth: 120,
      visible: true,
      render: 'text'
    },
    {
      title: 'Số bệnh nhân',
      key: 'maxPatients',
      align: 'center',
      width: 200,
      minWidth: 170,
      visible: true,
      render: 'text'
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 160,
      minWidth: 130,
      visible: true,
      render: 'custom'
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      align: 'center',
      width: 200,
      minWidth: 170,
      visible: false,
      render: 'text'
    },
    {
      title: 'Ngày cập nhật',
      key: 'updatedAt',
      align: 'center',
      width: 200,
      minWidth: 170,
      visible: false,
      render: 'text'
    },
    {
      title: 'Chức năng',
      key: 'actions',
      align: 'center',
      width: 120,
      minWidth: 110,
      fixed: 'right',
      visible: true,
      render: 'actions'
    }
  ];


  constructor() {
    super();
    this.searchForm = this.fb.group({
      keyword: [null]
    })
  }
  override ngOnInit() {
    super.ngOnInit();
  }
  override loadData(){
    this.isLoadingDataSource.set(true);
    const params = this.paramsForSearchLoadData;
    const body : any ={
      ...this.searchFormValue
    }
    this.doctorScheduleService.search(params,body)
      .pipe(
        takeUntil(this.unsubscribe),
        finalize(() => this.isLoadingDataSource.set(false))
      ).subscribe((res)=>{
        this.errorCode.set(String(res.code));
        if(apiResponseSucceeded(res) && res.result){
          this.dataSource = res.result.content;
          this.total = res.result.totalElements;
        } else {
          this.dataSource = [];
            this.total = 0;
            this.errorMessage.set(res.message||'Không thể tải danh sách lịch làm việc của bác sĩ. Vui lòng thử lại!')
        }
    });
  }
  protected onDelete(doctorSchedule: DoctorScheduleResponse): void {
    this.nzModalService.confirm({
      nzTitle: 'Xoá Wifi',
      nzContent: `Bạn có chắc chắn muốn xoá lịch làm #<strong>${doctorSchedule.id}</strong>?`,
      nzOkText: 'Xoá',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.doctorScheduleService.delete(doctorSchedule.id)
          .pipe(takeUntil(this.unsubscribe))
          .subscribe((res) => {
            if (res && apiResponseSucceeded(res)) {
              this.notification.success('<b>Thành công</b>', res.message || 'Xoá lịch làm thành công');
              this.loadData();
            } else {
              this.notification.error('<b>Lỗi</b>', res.message || 'Xoá làm thất bại');
            }
          });
      },
      nzCancelText: 'Huỷ'
    });
  }
  protected onOpenDetail(id?: number, isViewMode: boolean = false): void {
    if (!id && !this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) return;
    let title = 'Thêm mới lịch làm việc';
    if (id) {
      title = isViewMode ? 'Chi tiết lịch làm việc' : 'Cập nhật lịch làm việc';
    }

    // Dùng DoctorScheduleDetail (view-only) khi isViewMode; DoctorScheduleForm khi tạo/sửa
    if (isViewMode && id) {
      this.drawerService.create({
        nzTitle: title,
        nzContent: DoctorScheduleDetail,
        nzMaskClosable: true,
        nzClosable: true,
        nzKeyboard: true,
        nzWidth: '85vw',
        nzPlacement: 'right',
        nzData: { id },
        nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' },
      });
      return;
    }

    this.drawerService.create({
      nzTitle: title,
      nzContent: DoctorScheduleForm,
      nzMaskClosable: false,
      nzClosable: isViewMode,
      nzKeyboard: isViewMode,
      nzWidth: id ? '85vw' : 'min(1200px, 100vw)',
      nzPlacement: 'right',
      nzData: { id, isViewMode, onStatusChanged: () => this.loadData() },
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' },
    }).afterClose.subscribe((result) => {
      if (result?.success) this.loadData();
    });
  }

}


