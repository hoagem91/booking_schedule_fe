import { Component, inject } from '@angular/core';
import { BaseListComponent } from '../../../components/base-list.component';
import { ManagementSpecialtiesService } from '../../services/management-specialties.service';
import { finalize } from 'rxjs/operators';
import { Subscription, takeUntil } from 'rxjs';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { ShowErrorDirective } from '../../../directives/UI/show-error.directive';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputDirective, NzInputGroupComponent, NzInputGroupWhitSuffixOrPrefixDirective } from 'ng-zorro-antd/input';
import { NzIconDirective, NzIconModule } from 'ng-zorro-antd/icon';
import { ShareButton } from '../../../components/share-button/share-button';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { NzTagComponent } from 'ng-zorro-antd/tag';
import { ManagementSpecialtiesForm } from './management-specialties-form/management-specialties-form';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { SpecialtyResponseItem } from '../../models/specialty.model';
import { StatusUtils } from '../../../utils/status.utils';
import { NzTooltipDirective, NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonComponent, NzButtonModule } from 'ng-zorro-antd/button';
import { NzWaveDirective } from 'ng-zorro-antd/core/wave';
import { specialtyErrorMessage } from '../../../utils/specialty/specialty-error.utils';

@Component({
  selector: 'app-management-specialties',
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
  templateUrl: './management-specialties.html',
  styleUrl: './management-specialties.css',
})
export class ManagementSpecialties extends BaseListComponent{
  private request?: Subscription;
  protected specialtyService = inject(ManagementSpecialtiesService);
  protected drawerService = inject(NzDrawerService);
  protected nzModalService = inject(NzModalService);
  protected notification = inject(NzNotificationService);
  protected readonly StatusUtils = StatusUtils;

  protected override tableColumns: TableColumn[]=[
    {
      title: 'Mã chuyên khoa',
      key: 'code',
      align: 'left',
      width: 220,
      minWidth: 180,
      fixed: 'left',
      visible: true,
      render: 'text',
      allowCopy: true
    },
    {
      title: 'Tên chuyên khoa',
      key: 'name',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: true,
      render: 'text',
    },
    {
      title: 'Mô tả',
      key: 'description',
      align: 'left',
      width: 220,
      minWidth: 180,
      visible: true,
      render:'text',
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      align: 'center',
      width: 160,
      minWidth: 140,
      visible: true,
      render: 'text',
      pipeName: 'dateDisplay'
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 160,
      minWidth: 140,
      visible: true,
      render: 'custom',
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
    },
  ]
  constructor() {
    super();
    this.searchForm = this.fb.group({
      keyword: [''],
      status: [null]
    });
  }
  override ngOnInit() {
    super.ngOnInit();
  }
  override loadData() {
    this.request?.unsubscribe();
    this.isLoadingDataSource.set(true);
    this.clearError();
    const params = this.paramsForSearchLoadData;
    const body : any ={
      keyword: this.searchForm.controls['keyword'].value?.trim() || null,
      status: this.searchForm.controls['status'].value || null,
    }
    this.request = this.specialtyService.search(params,body)
      .pipe(takeUntil(this.unsubscribe),finalize(() => {this.isLoadingDataSource.set(false)}))
      .subscribe((res)=>{
        if(apiResponseSucceeded(res) && res.result && Array.isArray(res.result.content)){
          this.dataSource = res.result.content;
          this.total = res.result.totalElements;
        } else {
          this.dataSource = []; this.total = 0;
          this.setError(specialtyErrorMessage(res, 'Không thể tải danh sách chuyên khoa. Vui lòng thử lại.'), apiResponseSucceeded(res) ? 500 : res.code);
        }
      });
  }
  protected onDelete(specialtyId: SpecialtyResponseItem): void {
    this.nzModalService.confirm({
      nzTitle: 'Xóa chuyên khoa',
      nzContent: `Bạn có chắc chắn muốn xoá chuyên khoa <strong>${specialtyId.name}</strong>?`,
      nzOkText: 'Xoá',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.specialtyService.delete(specialtyId.id)
          .pipe(takeUntil(this.unsubscribe))
          .subscribe((res) => {
            if (res && apiResponseSucceeded(res)) {
              this.notification.success('<b>Thành công</b>', res.message || 'Xoá chuyên khoa thành công');
              this.loadData();
            } else {
              this.notification.error('<b>Lỗi</b>', specialtyErrorMessage(res, 'Không thể xóa chuyên khoa. Vui lòng thử lại.'));
            }
          });
      },
      nzCancelText: 'Huỷ'
    });
  }
  protected onOpenDetail(id?: number, isViewMode: boolean = false): void {
    if (!isViewMode && !this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) return;
    let title = 'Thêm mới chuyên khoa';
    if (id) {
      title = isViewMode ? 'Chi tiết chuyên khoa' : 'Cập nhật chuyên khoa';
    }

    this.drawerService.create({
      nzTitle: title,
      nzContent: ManagementSpecialtiesForm,
      nzMaskClosable: false,
      nzClosable: isViewMode,
      nzKeyboard: isViewMode,
      nzWidth: 'min(1100px, 100vw)',
      nzPlacement: 'right',
      nzData: { id, isViewMode },
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' },
    }).afterClose.subscribe((result) => {
      if (result?.success) this.loadData();
    });
  }
}
