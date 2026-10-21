import { Subject } from "rxjs";
import { Component, inject } from "@angular/core";
import { BaseComponent } from "./base.component";
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { NzUploadFile } from "ng-zorro-antd/upload";

@Component({
  template: ''
})
export abstract class BaseFormComponent extends BaseComponent{
  protected override unsubscribe: Subject<any> = new Subject();
  protected saveForm: FormGroup = new FormGroup({});

  protected previewUrls: { [key: string]: string | string[] } = {};
  protected uploadedFiles: { [key: string]: NzUploadFile | NzUploadFile[] } = {};
  
  public override ngOnInit() {
    super.ngOnInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
  }
  get saveFormValue(): any {
    return this.saveForm.value;
  }

  get saveFormValueRaw(): any {
    return this.saveForm.getRawValue();
  }

  protected getSaveFormItemControl(name: string): FormControl {
    return this.saveForm.get(name) as FormControl;
  }

  protected getSaveFormItemAsFormArray(name: string): FormArray {
    return this.saveForm.get(name) as FormArray;
  }

  protected setSaveFormItemControl(name: string, value: any): void {
    this.saveForm.get(name)?.setValue(value);
  }

  protected setSaveFormItemControlDisabled(name: string, disabled: boolean): void {
    if (disabled) {
      this.saveForm.get(name)?.disable();
    } else {
      this.saveForm.get(name)?.enable();
    }
  }

  protected setSaveFormItemControlRequired(name: string, required: boolean): void {
    const control = this.saveForm.get(name);
    if (control) {
      if (required) {
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity();
    }
  }

  protected setSaveFormItemControlReadonly(name: string, readonly: boolean): void {
    if (readonly) {
      this.saveForm.get(name)?.disable();
    } else {
      this.saveForm.get(name)?.enable();
    }
  }

  protected getSaveFormItemValue(name: string): any {
    return this.getSaveFormItemControl(name).value;
  }

  protected setSaveFormItemValue(name: string, value: any): void {
    this.getSaveFormItemControl(name).setValue(value);
  }

  protected removeSaveFormItem(name: string): void {
    this.saveForm.removeControl(name);
  }

  protected addSaveFormItem(name: string, value: any): void {
    this.saveForm.addControl(name, new FormControl(value));
  }

  protected getSaveFormValueItemInFormArray(formArrayName: string, index: number, controlName: string): any {
    const formArray = this.getSaveFormItemAsFormArray(formArrayName);
    const formGroup = formArray.at(index) as FormGroup;
    return formGroup.get(controlName)?.value;
  }

  protected addSaveFormItemWithValidators(name: string, value: any, validators: any[]): void {
    this.saveForm.addControl(name, new FormControl(value, validators));
  }

  protected beforeUploadFactory = (field: string, multiple: boolean) => (file: NzUploadFile, _fileList: NzUploadFile[]): boolean => {
    if (multiple) {
      if (!this.uploadedFiles[field]) {
        this.uploadedFiles[field] = [];
        this.previewUrls[field] = [];
      }
      (this.uploadedFiles[field] as NzUploadFile[]).push(file);
      (this.previewUrls[field] as string[]).push(URL.createObjectURL(file as any));
    } else {
      this.uploadedFiles[field] = file;
      if (this.previewUrls[field]) {
        URL.revokeObjectURL(this.previewUrls[field] as string);
      }
      this.previewUrls[field] = URL.createObjectURL(file as any);
    }
    return false;
  };

  protected exportFileFormData(field: string, formData: FormData): void {
    const file = this.uploadedFiles[field];
    if (file) {
      if (Array.isArray(file)) {
        file.forEach(f => {
          formData.append(field, f as any);
        });
      } else {
        formData.append(field, file as any);
      }
    }
  }

  protected deleteUploadedFile(field: string, index?: number): void {
    if (this.uploadedFiles[field]) {
      if (Array.isArray(this.uploadedFiles[field])) {
        const files = this.uploadedFiles[field] as NzUploadFile[];
        const urls = this.previewUrls[field] as string[];
        if (index !== undefined && index >= 0 && index < files.length) {
          files.splice(index, 1);
          if (urls && index < urls.length) {
            URL.revokeObjectURL(urls[index]);
            urls.splice(index, 1);
          }
        }
      } else {
        URL.revokeObjectURL(this.previewUrls[field] as string);
        delete this.uploadedFiles[field];
        delete this.previewUrls[field];
      }
    }
  }

  protected getSinglePreviewUrl(field: string): string {
    const url = this.previewUrls[field];
    return Array.isArray(url) ? (url[0] || '') : (url || '');
  }

  protected getMultiplePreviewUrls(field: string): string[] {
    const url = this.previewUrls[field];
    return Array.isArray(url) ? url : [];
  }

  protected getSingleFileName(field: string): string {
    const file = this.uploadedFiles[field];
    return Array.isArray(file) ? (file[0]?.name || '') : (file?.name || '');
  }

  protected getMultipleFileNames(field: string): string[] {
    const file = this.uploadedFiles[field];
    return Array.isArray(file) ? file.map(f => f.name || '') : [];
  }

  protected abstract handleCancel(): void;

  protected handleOk(): void {
    if(this.saveForm.invalid) {
      Object.values(this.saveForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
  }
}
