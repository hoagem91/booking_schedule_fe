import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base.component';
import { AdminDoctorService } from '../../../services/admin-doctor.service';
import { AdminDoctor, DoctorDeactivateResponse } from '../../../models/admin-doctor.model';
import { UserStatus } from '../../../models/user.model';
import { ApiResponse, apiResponseSucceeded } from '../../../../models/api-response.model';
import { doctorErrorMessage } from '../../../../utils/doctor/doctor-error.utils';
import { userIsAdmin } from '../../management-users/user-policy';

@Component({
  selector: 'app-doctor-action', imports: [ReactiveFormsModule, NzButtonModule, NzSelectModule],
  template: `
    @if (loading()) { <p role="status">Đang kiểm tra hồ sơ bác sĩ…</p> }
    @if (error()) { <p class="action-error" role="alert">{{ error() }}</p> }
    @if (!doctor() && !loading()) { <button nz-button (click)="load()">Tải lại hồ sơ</button> }
    @if (doctor(); as item) {
      <h2>{{ data.mode === 'status' ? 'Đổi trạng thái hồ sơ' : 'Vô hiệu hóa hồ sơ' }} — {{ item.fullName }}</h2>
      <p>{{ item.doctorCode }} · {{ item.specialtyName }}</p>
      <p>Trạng thái hồ sơ hiện tại: {{ item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động' }}.</p>
      @if (data.mode === 'status') {
        <label>Trạng thái mới
          <nz-select [formControl]="status" aria-label="Trạng thái hồ sơ bác sĩ">
            <nz-option nzValue="ACTIVE" nzLabel="Đang hoạt động" />
            <nz-option nzValue="INACTIVE" nzLabel="Ngừng hoạt động" />
          </nz-select>
        </label>
      }
      <p>Ngừng hoạt động giữ lại hồ sơ, tài khoản, vai trò Bác sĩ và lịch sử. Thao tác này không khóa đăng nhập hay tự hủy ca làm/lịch hẹn.</p>
      <p>Ca OPEN/FULL chưa kết thúc sẽ chặn ngừng hoạt động. Kích hoạt yêu cầu tài khoản và chuyên khoa đang hoạt động.</p>
      <p>Nếu bị chặn bởi ca làm việc, hãy đóng hộp này, mở “Ca làm việc” để tra cứu và xử lý ca trước khi thử lại.</p>
    }
    <div class="action-buttons"><button nz-button [disabled]="saving()" (click)="close()">Hủy</button>
      <button nz-button nzType="primary" [nzDanger]="data.mode === 'deactivate'" [nzLoading]="saving()" [disabled]="!allowed || loading() || saving()" (click)="save()">{{ data.mode === 'status' ? 'Cập nhật trạng thái' : 'Vô hiệu hóa hồ sơ' }}</button>
    </div>
  `,
  styles: [`:host{display:block}h2{font-size:18px}p{line-height:1.7}label{display:grid;gap:8px;max-width:300px}.action-buttons{display:flex;gap:8px;justify-content:flex-end;margin-top:24px}.action-error{color:#ac302b;background:#fff2ef;padding:12px;border-radius:6px}`]
})
export class DoctorAction extends BaseComponent {
  protected readonly data = inject<{ id: number; mode: 'status' | 'deactivate' }>(NZ_DRAWER_DATA);
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(AdminDoctorService);
  private readonly message = inject(NzMessageService);
  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly status = this.fb.nonNullable.control<UserStatus>('INACTIVE');
  protected get allowed(): boolean {
    const item = this.doctor();
    return userIsAdmin(this.currentUser()) && !!item && !!(this.data.mode === 'status' ? item.capabilities?.canChangeStatus : item.capabilities?.canDeactivateProfile);
  }
  override ngOnInit(): void { super.ngOnInit(); this.load(); }
  protected close(): void { if (!this.saving()) this.drawer.close(); }
  protected load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true); this.error.set(''); this.doctor.set(null);
    this.api.detail(this.data.id).pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({ next: res => {
      if (!apiResponseSucceeded(res) || res.result?.id !== this.data.id) { this.error.set(doctorErrorMessage(res, 'Không thể tải hồ sơ.')); return; }
      this.doctor.set(res.result); this.status.setValue(res.result.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
      if (!this.allowed) this.error.set('Bạn không được phép thực hiện thao tác này trên hồ sơ bác sĩ.');
    }, error: error => this.error.set(doctorErrorMessage(error)) });
  }
  protected save(): void {
    if (!this.allowed || this.saving() || this.loading()) return;
    const item = this.doctor()!;
    const status = this.status.value;
    if (this.data.mode === 'status') {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) { this.error.set('Trạng thái hồ sơ không hợp lệ.'); return; }
      if (status === item.status) { this.error.set('Trạng thái hồ sơ chưa thay đổi.'); return; }
      if (status === 'ACTIVE' && (item.userStatus !== 'ACTIVE' || item.specialtyStatus !== 'ACTIVE')) {
        this.error.set('Tài khoản và chuyên khoa phải đang hoạt động trước khi kích hoạt hồ sơ bác sĩ.'); return;
      }
    }
    this.saving.set(true); this.error.set(''); this.status.disable();
    const request: Observable<ApiResponse<AdminDoctor | DoctorDeactivateResponse>> =
      this.data.mode === 'status' ? this.api.changeStatus(item.id, status) : this.api.deactivate(item.id);
    request.pipe(takeUntil(this.unsubscribe), finalize(() => { this.saving.set(false); this.status.enable(); })).subscribe({ next: res => {
      const result = res.result;
      const correctResult = result?.id === item.id && (this.data.mode === 'status'
        ? result.status === status : 'action' in result && result.action === 'DEACTIVATED' && result.status === 'INACTIVE');
      if (apiResponseSucceeded(res) && correctResult) {
        this.message.success(this.data.mode === 'status' ? 'Cập nhật trạng thái hồ sơ thành công' : 'Đã vô hiệu hóa hồ sơ bác sĩ; hồ sơ và lịch sử được giữ lại');
        this.drawer.close({ success: true });
      } else this.error.set(doctorErrorMessage(res, 'Chưa xác định được kết quả. Vui lòng tải lại danh sách trước khi thử lại.'));
    }, error: error => this.error.set(doctorErrorMessage(error)) });
  }
}
