import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, finalize, merge, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { BaseListComponent } from '../../../components/base-list.component';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import { ManagementUsersService } from '../../services/management-users.service';
import { AdminUser, USER_EDITOR_TITLES, USER_ROLE_LABELS, UserEditorMode, UserRole } from '../../models/user.model';
import { userErrorMessage } from '../../../utils/user/user-error.utils';
import { userActionAllowed, userIsAdmin } from './user-policy';
import { UserEditor } from './user-editor/user-editor';
import { UserAudit } from './user-audit/user-audit';

@Component({
  selector: 'app-management-users',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule, NzTooltipModule, ShareTableComponent, SettingTableComponent],
  templateUrl: './management-users.html',
  styleUrl: './management-users.css'
})
export class ManagementUsers extends BaseListComponent<AdminUser> {
  private readonly api = inject(ManagementUsersService);
  private readonly drawer = inject(NzDrawerService);
  private request?: Subscription;
  protected readonly listError = signal('');
  protected readonly drawerOpen = signal(false);
  protected readonly labels = USER_ROLE_LABELS;

  protected roleLabel(role: string): string {
    return this.labels[role as UserRole] || role;
  }

  protected readonly filterRoles = Object.keys(USER_ROLE_LABELS) as UserRole[];
  protected readonly actions: { mode: UserEditorMode; label: string; icon: string }[] = [
    { mode: 'edit', label: 'Sửa thông tin tài khoản', icon: 'edit' },
    { mode: 'status', label: 'Khóa / mở tài khoản', icon: 'poweroff' },
    { mode: 'roles', label: 'Thay đổi vai trò', icon: 'control' },
    { mode: 'password', label: 'Đặt lại mật khẩu', icon: 'tool' },
    { mode: 'deactivate', label: 'Vô hiệu hóa tài khoản', icon: 'minus-circle' }
  ];
  protected override tableColumns: TableColumn[] = [
    {
      title: 'Tên đăng nhập',
      key: 'username',
      width: 180,
      minWidth: 150,
      align: 'left',
      visible: true,
      fixed: 'left',
      render: 'custom'
    },
    { title: 'Họ và tên', key: 'fullName', width: 200, minWidth: 160, align: 'left', visible: true, render: 'text' },
    { title: 'Email', key: 'email', width: 230, minWidth: 180, align: 'left', visible: true, render: 'text' },
    { title: 'Điện thoại', key: 'phone', width: 150, minWidth: 120, align: 'left', visible: true, render: 'text' },
    { title: 'Vai trò', key: 'roles', width: 220, minWidth: 180, align: 'left', visible: true, render: 'custom' },
    { title: 'Trạng thái', key: 'status', width: 160, minWidth: 140, align: 'center', visible: true, render: 'custom' },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      width: 150,
      minWidth: 130,
      align: 'center',
      visible: true,
      render: 'text',
      pipeName: 'dateDisplay'
    },
    {
      title: 'Chức năng',
      key: 'actions',
      width: 240,
      minWidth: 220,
      align: 'center',
      visible: true,
      fixed: 'right',
      render: 'actions'
    }
  ];

  constructor() {
    super();
    this.searchForm = this.fb.group({ keyword: [''], status: [null], role: [null] });
  }

  protected get canCreate(): boolean {
    return userIsAdmin(this.currentUser());
  }

  protected allowed(user: AdminUser, mode: UserEditorMode): boolean {
    return userActionAllowed(this.currentUser(), user, mode);
  }

  protected override listenSearchFormChange(): void {
    super.listenSearchFormChange();
    merge(this.searchForm.controls['role'].valueChanges, this.searchForm.controls['status'].valueChanges)
      .pipe(debounceTime(0), takeUntil(this.unsubscribe)).subscribe(() => this.onBtnSearch());
  }

  override loadData(): void {
    this.request?.unsubscribe();
    this.isLoadingDataSource.set(true);
    this.listError.set('');
    this.request = this.api.search({ page: this.currentPage - 1, size: this.pageSize, sort: 'id,asc' }, {
      keyword: this.searchForm.value.keyword?.trim() || null,
      status: this.searchForm.value.status ?? null,
      role: this.searchForm.value.role ?? null
    }).pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
          this.dataSource = res.result!.content;
          this.total = res.result!.totalElements;
        } else {
          this.dataSource = [];
          this.total = 0;
          this.listError.set(userErrorMessage(res, 'Không thể tải danh sách tài khoản. Vui lòng thử lại.'));
        }
      }, error: error => {
        this.dataSource = [];
        this.total = 0;
        this.listError.set(userErrorMessage(error, 'Không thể tải danh sách tài khoản. Vui lòng thử lại.'));
      }
    });
  }

  protected open(mode: UserEditorMode, user?: AdminUser): void {
    if (this.drawerOpen() || !this.canCreate || (user && !this.allowed(user, mode))) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: USER_EDITOR_TITLES[mode], nzContent: UserEditor, nzData: { id: user?.id, mode },
      nzWidth: 'min(1100px, 100vw)', nzMaskClosable: false, nzClosable: mode === 'view', nzKeyboard: mode === 'view',
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' }
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      this.drawerOpen.set(false);
      if (result?.success && !result.sessionEnded) {
        this.loadData();
        if (user?.id === this.currentUser()?.id) this.managementAccess.load(true).pipe(takeUntil(this.unsubscribe)).subscribe({
          error: () => {
          }
        });
      }
    });
  }

  protected audit(user: AdminUser): void {
    if (this.drawerOpen() || !this.canCreate) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: 'Nhật ký tài khoản',
      nzContent: UserAudit,
      nzData: { id: user.id },
      nzWidth: 'min(1000px, 100vw)',
      nzMaskClosable: false
    })
      .afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(() => this.drawerOpen.set(false));
  }
}
