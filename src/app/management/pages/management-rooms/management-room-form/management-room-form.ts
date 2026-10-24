import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, of, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { ManagementRoomsService } from '../../../services/management-rooms.service';
import { ROOM_STATUSES, RoomRequest, RoomUpdateRequest, RoomResponse, RoomSpecialtyOption } from '../../../models/room.model';
import { roomErrorMessage } from '../../../../utils/room/room-error.utils';

@Component({
  selector: 'app-management-room-form',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzFormModule, NzCardModule, NzSelectModule, ShowLoadingDirective],
  templateUrl: './management-room-form.html',
  styleUrl: './management-room-form.css',
})
export class ManagementRoomForm extends BaseFormComponent {
  private readonly data = inject<{ id?: number; isViewMode?: boolean }>(NZ_DRAWER_DATA);
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(ManagementRoomsService);
  private readonly message = inject(NzMessageService);
  protected readonly isEditMode = !!this.data.id;
  protected readonly isViewMode = !!this.data.isViewMode;
  protected readonly statuses = ROOM_STATUSES;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loaded = signal(false);
  protected readonly formError = signal('');
  protected readonly specialties = signal<RoomSpecialtyOption[]>([]);
  protected room: RoomResponse | null = null;

  constructor() {
    super();
    this.saveForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
      location: ['', [Validators.maxLength(255)]],
      specialtyId: [0],
      status: ['AVAILABLE', [Validators.required, Validators.pattern(/^(AVAILABLE|OCCUPIED|MAINTENANCE|INACTIVE)$/)]],
    });
    this.applyMode();
  }
  override ngOnInit(): void { super.ngOnInit(); this.loadDataForForm(); }
  protected loadDataForForm(): void {
    if (this.isLoading() || this.isSaving()) return;
    this.isLoading.set(true); this.loaded.set(false); this.formError.set('');
    forkJoin({ detail: this.data.id ? this.api.detail(this.data.id) : of(null), specialties: this.api.specialties(true) })
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoading.set(false)))
      .subscribe({ next: ({ detail, specialties }) => {
        if (this.data.id && (!apiResponseSucceeded(detail) || detail?.result?.id !== this.data.id)) {
          this.formError.set(roomErrorMessage(detail, 'Không thể tải thông tin phòng khám. Vui lòng thử lại.')); return;
        }
        if (!apiResponseSucceeded(specialties) || !Array.isArray(specialties.result)) {
          this.formError.set(roomErrorMessage(specialties, 'Không thể tải danh sách chuyên khoa. Vui lòng thử lại.')); return;
        }
        const options = specialties.result.filter(item => item.status === 'ACTIVE');
        this.room = detail?.result ?? null;
        if (this.room) {
          const item = this.room;
          if (item.specialtyId && !options.some(option => option.id === item.specialtyId))
            options.push({ id: item.specialtyId, name: item.specialtyName || 'Chuyên khoa hiện tại', status: 'INACTIVE' });
          this.saveForm.patchValue({ code: item.code, name: item.name, specialtyId: item.specialtyId ?? 0,
            location: item.location ?? '', status: item.status }, { emitEvent: false });
        }
        this.specialties.set(options); this.applyMode();
        this.saveForm.markAsPristine(); this.saveForm.markAsUntouched(); this.loaded.set(true);
      }, error: error => this.formError.set(roomErrorMessage(error, 'Không thể tải dữ liệu phòng khám. Vui lòng thử lại.')) });
  }
  private applyMode(): void {
    this.saveForm.enable({ emitEvent: false });
    if (this.isViewMode) this.saveForm.disable({ emitEvent: false });
  }
  protected override handleCancel(): void { if (!this.isSaving()) this.drawer.close({ success: false }); }
  protected override handleOk(): void {
    if (this.isViewMode || !this.loaded() || this.isSaving() || this.isLoading()) return;
    this.saveForm.markAllAsTouched(); super.handleOk();
    if (this.saveForm.invalid) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) { this.formError.set('Bạn không có quyền lưu phòng khám.'); return; }
    const value = this.saveForm.getRawValue();
    const specialtyId = value.specialtyId === 0 ? null : value.specialtyId;
    const specialty = this.specialties().find(item => item.id === specialtyId);
    if (specialtyId !== null && (!specialty || (specialty.status !== 'ACTIVE' && specialtyId !== this.room?.specialtyId))) {
      this.formError.set('Vui lòng chọn chuyên khoa đang hoạt động hoặc chuyển về phòng dùng chung.'); return;
    }
    let body: RoomRequest | RoomUpdateRequest;
    if (this.room) {
      const old = this.room, update: RoomUpdateRequest = {};
      if (value.code.trim() !== old.code) update.code = value.code.trim();
      if (value.name.trim() !== old.name) update.name = value.name.trim();
      if (value.location.trim() !== (old.location ?? '')) {
        if (value.location.trim()) update.location = value.location.trim();
        else update.clearLocation = true;
      }
      if (value.status !== old.status) update.status = value.status;
      if (specialtyId !== old.specialtyId) {
        if (specialtyId === null) update.clearSpecialty = true;
        else update.specialtyId = specialtyId;
      }
      if (!Object.keys(update).length) { this.formError.set('Chưa có thay đổi để cập nhật.'); return; }
      body = update;
    } else {
      body = { code: value.code.trim(), name: value.name.trim(), location: value.location.trim() || null,
        specialtyId, status: value.status };
    }
    this.formError.set(''); this.isSaving.set(true); this.saveForm.disable({ emitEvent: false });
    const request = this.data.id ? this.api.update(this.data.id, body as RoomUpdateRequest) : this.api.create(body as RoomRequest);
    request.pipe(takeUntil(this.unsubscribe), finalize(() => { this.isSaving.set(false); this.applyMode(); }))
      .subscribe({ next: res => {
        if (apiResponseSucceeded(res) && res.result?.id && (!this.data.id || res.result.id === this.data.id)) {
          this.message.success(this.isEditMode ? 'Cập nhật phòng khám thành công' : 'Tạo phòng khám thành công');
          this.drawer.close({ success: true, data: res.result });
        } else this.formError.set(roomErrorMessage(res, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.'));
      }, error: error => this.formError.set(roomErrorMessage(error, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.')) });
  }
}
