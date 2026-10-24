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
import { finalize, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ManagementSpecialtiesService } from '../../../services/management-specialties.service';
import { SpecialtyCreateRequest, SpecialtyUpdateRequest, SpecialtyResponseItem } from '../../../models/specialty.model';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { specialtyErrorMessage } from '../../../../utils/specialty/specialty-error.utils';

@Component({
  selector: 'app-management-specialties-form',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzFormModule, NzCardModule, NzSelectModule, ShowLoadingDirective],
  templateUrl: './management-specialties-form.html',
  styleUrl: './management-specialties-form.css',
})
export class ManagementSpecialtiesForm extends BaseFormComponent {
  private readonly data = inject<{ id?: number; isViewMode?: boolean }>(NZ_DRAWER_DATA, { optional: true }) ?? {};
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(ManagementSpecialtiesService);
  private readonly message = inject(NzMessageService);
  protected readonly isEditMode = !!this.data.id;
  protected readonly isViewMode = !!this.data.isViewMode;
  protected readonly isLoadingDataForForm = signal(false);
  protected readonly isSavingForm = signal(false);
  protected readonly loaded = signal(!this.isEditMode);
  protected readonly formError = signal('');
  protected specialty: SpecialtyResponseItem | null = null;

  constructor() {
    super();
    this.saveForm = this.fb.group({
      code: ['', this.isEditMode ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)] : [Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
      description: [''],
      status: ['ACTIVE', [Validators.required, Validators.pattern(/^(ACTIVE|INACTIVE)$/)]],
    });
    this.applyMode();
  }
  override ngOnInit(): void { super.ngOnInit(); if (this.isEditMode) this.loadDataForForm(); }

  protected loadDataForForm(): void {
    if (!this.data.id || this.isLoadingDataForForm()) return;
    this.isLoadingDataForForm.set(true); this.loaded.set(false); this.formError.set('');
    this.api.getSpecialtyDetail(this.data.id).pipe(takeUntil(this.unsubscribe),
      finalize(() => this.isLoadingDataForForm.set(false))).subscribe({ next: res => {
      if (!apiResponseSucceeded(res) || res.result?.id !== this.data.id) {
        this.formError.set(specialtyErrorMessage(res, 'Không thể tải thông tin chuyên khoa. Vui lòng thử lại.')); return;
      }
      this.specialty = res.result!;
      this.saveForm.patchValue({ code: this.specialty.code, name: this.specialty.name,
        description: this.specialty.description ?? '', status: this.specialty.status }, { emitEvent: false });
      this.applyMode(); this.saveForm.markAsPristine(); this.saveForm.markAsUntouched(); this.loaded.set(true);
    }, error: error => this.formError.set(specialtyErrorMessage(error, 'Không thể kết nối máy chủ để tải chuyên khoa.')) });
  }
  private applyMode(): void {
    this.saveForm.enable({ emitEvent: false });
    if (!this.isEditMode) this.saveForm.controls['status'].disable({ emitEvent: false });
    if (this.isViewMode) this.saveForm.disable({ emitEvent: false });
  }
  protected override handleCancel(): void { if (!this.isSavingForm()) this.drawer.close({ success: false }); }
  protected override handleOk(): void {
    if (this.isViewMode || !this.loaded() || this.isLoadingDataForForm() || this.isSavingForm()) return;
    this.saveForm.markAllAsTouched(); super.handleOk(); if (this.saveForm.invalid) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) { this.formError.set('Bạn không có quyền lưu chuyên khoa.'); return; }
    const value = this.saveForm.getRawValue();
    let body: SpecialtyCreateRequest | SpecialtyUpdateRequest;
    if (this.specialty) {
      const update: SpecialtyUpdateRequest = {};
      if (value.code.trim() !== this.specialty.code) update.code = value.code.trim();
      if (value.name.trim() !== this.specialty.name) update.name = value.name.trim();
      if (value.description !== (this.specialty.description ?? '')) update.description = value.description;
      if (value.status !== this.specialty.status) update.status = value.status;
      if (!Object.keys(update).length) { this.formError.set('Chưa có thay đổi để cập nhật.'); return; }
      body = update;
    } else {
      body = { name: value.name.trim(), ...(value.code.trim() ? { code: value.code.trim() } : {}),
        ...(value.description ? { description: value.description } : {}) };
    }
    this.formError.set(''); this.isSavingForm.set(true); this.saveForm.disable({ emitEvent: false });
    const request = this.isEditMode ? this.api.update(this.data.id!, body) : this.api.create(body as SpecialtyCreateRequest);
    request.pipe(takeUntil(this.unsubscribe), finalize(() => { this.isSavingForm.set(false); this.applyMode(); })).subscribe({ next: res => {
      if (apiResponseSucceeded(res) && res.result?.id && (!this.isEditMode || res.result.id === this.data.id)) {
        this.message.success(this.isEditMode ? 'Cập nhật chuyên khoa thành công' : 'Tạo chuyên khoa thành công');
        this.drawer.close({ success: true, data: res.result });
      } else {
        this.formError.set(specialtyErrorMessage(res, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.'));
      }
    }, error: error => this.formError.set(specialtyErrorMessage(error, 'Không thể xác định kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.')) });
  }

}
