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
import { ManagementServicesService } from '../../../services/management-services.service';
import { ServiceCreateRequest, ServiceUpdateRequest, ServiceResponse, ServiceSpecialtyOption } from '../../../models/service.model';
import { serviceErrorMessage } from '../../../../utils/service/service-error.utils';
import { serviceDurationValidator, servicePriceValidator } from './service-form.validators';

@Component({
  selector: 'app-management-service-form',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzFormModule, NzCardModule, NzSelectModule, ShowLoadingDirective],
  templateUrl: './management-service-form.html',
  styleUrl: './management-service-form.css',
})
export class ManagementServiceForm extends BaseFormComponent {
  private readonly data = inject<{ id?: number; isViewMode?: boolean }>(NZ_DRAWER_DATA);
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(ManagementServicesService);
  private readonly message = inject(NzMessageService);
  protected readonly isEditMode = !!this.data.id;
  protected readonly isViewMode = !!this.data.isViewMode;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loaded = signal(false);
  protected readonly formError = signal('');
  protected readonly specialties = signal<ServiceSpecialtyOption[]>([]);
  protected service: ServiceResponse | null = null;

  constructor() {
    super();
    this.saveForm = this.fb.group({
      code: ['', this.isEditMode ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)] : [Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
      specialtyId: [0],
      price: [null, [Validators.required, servicePriceValidator]],
      durationMinutes: [30, [serviceDurationValidator]],
      description: [''],
      status: ['ACTIVE', [Validators.required, Validators.pattern(/^(ACTIVE|INACTIVE)$/)]],
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
          this.formError.set(serviceErrorMessage(detail, 'Không thể tải thông tin dịch vụ. Vui lòng thử lại.')); return;
        }
        if (!apiResponseSucceeded(specialties) || !Array.isArray(specialties.result)) {
          this.formError.set(serviceErrorMessage(specialties, 'Không thể tải danh sách chuyên khoa. Vui lòng thử lại.')); return;
        }
        const options = specialties.result.filter(item => item.status === 'ACTIVE');
        this.service = detail?.result ?? null;
        if (this.service) {
          const item = this.service;
          if (item.specialtyId && !options.some(option => option.id === item.specialtyId)) {
            options.push({ id: item.specialtyId, name: item.specialtyName || 'Chuyên khoa hiện tại', status: 'INACTIVE' });
          }
          this.saveForm.patchValue({ code: item.code, name: item.name, specialtyId: item.specialtyId ?? 0,
            price: item.price, durationMinutes: item.durationMinutes, description: item.description ?? '', status: item.status }, { emitEvent: false });
        }
        this.specialties.set(options); this.applyMode();
        this.saveForm.markAsPristine(); this.saveForm.markAsUntouched(); this.loaded.set(true);
      }, error: error => this.formError.set(serviceErrorMessage(error, 'Không thể tải dữ liệu dịch vụ. Vui lòng thử lại.')) });
  }
  private applyMode(): void {
    this.saveForm.enable({ emitEvent: false });
    if (!this.isEditMode) this.saveForm.controls['status'].disable({ emitEvent: false });
    if (this.isViewMode) this.saveForm.disable({ emitEvent: false });
  }
  protected override handleCancel(): void { if (!this.isSaving()) this.drawer.close({ success: false }); }
  protected override handleOk(): void {
    if (this.isViewMode || !this.loaded() || this.isSaving() || this.isLoading()) return;
    this.saveForm.markAllAsTouched(); super.handleOk();
    if (this.saveForm.invalid) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) { this.formError.set('Bạn không có quyền lưu dịch vụ.'); return; }
    const value = this.saveForm.getRawValue();
    // A selectable sentinel lets NZ Select display the common-service option.
    if (value.specialtyId === 0) value.specialtyId = null;
    const specialty = value.specialtyId === null ? null : this.specialties().find(item => item.id === value.specialtyId);
    const changingToInactiveSpecialty = specialty?.status !== 'ACTIVE' && (value.specialtyId !== this.service?.specialtyId
      || (value.status === 'ACTIVE' && value.status !== this.service?.status));
    if (value.specialtyId !== null && (!specialty || changingToInactiveSpecialty)) {
      this.formError.set('Vui lòng chọn chuyên khoa đang hoạt động hoặc chuyển dịch vụ về dùng chung.'); return;
    }
    let body: ServiceCreateRequest | ServiceUpdateRequest;
    if (this.service) {
      const old = this.service, update: ServiceUpdateRequest = {};
      if (value.code.trim() !== old.code) update.code = value.code.trim();
      if (value.name.trim() !== old.name) update.name = value.name.trim();
      if (value.price !== old.price) update.price = value.price;
      if (value.durationMinutes !== null && value.durationMinutes !== old.durationMinutes) update.durationMinutes = value.durationMinutes;
      if (value.description !== (old.description ?? '')) update.description = value.description;
      if (value.status !== old.status) update.status = value.status;
      if (value.specialtyId !== old.specialtyId) {
        if (value.specialtyId === null) update.clearSpecialty = true;
        else update.specialtyId = value.specialtyId;
      }
      if (!Object.keys(update).length) { this.formError.set('Chưa có thay đổi để cập nhật.'); return; }
      body = update;
    } else {
      body = { name: value.name.trim(), price: value.price,
        ...(value.code.trim() ? { code: value.code.trim() } : {}),
        ...(value.specialtyId !== null ? { specialtyId: value.specialtyId } : {}),
        ...(value.durationMinutes !== null ? { durationMinutes: value.durationMinutes } : {}),
        ...(value.description ? { description: value.description } : {}) };
    }
    this.formError.set(''); this.isSaving.set(true); this.saveForm.disable({ emitEvent: false });
    const request = this.data.id ? this.api.update(this.data.id, body) : this.api.create(body as ServiceCreateRequest);
    request.pipe(takeUntil(this.unsubscribe), finalize(() => { this.isSaving.set(false); this.applyMode(); }))
      .subscribe({ next: res => {
        if (apiResponseSucceeded(res) && res.result?.id && (!this.data.id || res.result.id === this.data.id)) {
          this.message.success(this.isEditMode ? 'Cập nhật dịch vụ thành công' : 'Tạo dịch vụ thành công');
          this.drawer.close({ success: true, data: res.result });
        } else this.formError.set(serviceErrorMessage(res, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.'));
      }, error: error => this.formError.set(serviceErrorMessage(error, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.')) });
  }
}
