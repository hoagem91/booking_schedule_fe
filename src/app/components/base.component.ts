import { BehaviorSubject, Subject, Subscription } from "rxjs";
import { UserProfileResponse } from "../models/user-profile.model";
import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, DoCheck, inject, OnChanges, OnDestroy, OnInit, signal, TemplateRef, viewChild } from "@angular/core";
import { userProfile$ } from "../store/user-profile.store";
import { NgxPermissionsService } from 'ngx-permissions';
import { FormBuilder } from "@angular/forms";
import { UserTypeEnum } from "../enum/user/user.enum";
import { DateFormatConstants } from "../constants/date-format.constants";
import { DataUtils } from "../utils/data.utils";

@Component({
  template: ''
})
export class BaseComponent implements OnInit, OnDestroy, AfterViewInit, AfterContentInit, AfterViewChecked, AfterContentChecked, DoCheck, OnChanges {
  protected unsubscribe: Subject<any> = new Subject();
  protected userProfile$: BehaviorSubject<UserProfileResponse | null> = new BehaviorSubject<UserProfileResponse | null>(null);
  protected userProfileSubscription: Subscription | undefined;
  protected listPermissions$: BehaviorSubject<{ id: number; name: string }[]> = new BehaviorSubject<{ id: number; name: string }[]>([]);
  private permissionsService: NgxPermissionsService = inject(NgxPermissionsService);
  public errorCode = signal<string>('');
  public errorMessage = signal<string>('');

  protected readonly fb: FormBuilder = inject(FormBuilder);

  protected readonly DateFormatConstants = DateFormatConstants;

  ngOnInit() {
    this.userProfileSubscription = userProfile$.subscribe(profile => {
      if (profile) {
        this.userProfile$.next(profile);
        const rawPermissions = DataUtils.decryptUsingAES256(profile.permission);
        const listPermissions = rawPermissions.split(',').map((value, key) => { return { id: key + 1, name: value } });
        this.listPermissions$.next(listPermissions);
        this.permissionsService.loadPermissions(listPermissions.map(permission => permission.name));
      }
    });
  }

  ngOnDestroy() {
    // Ngừng các subscription của màn đã đóng, tránh nhận đổi kho và ghi lại URL cũ.
    this.unsubscribe.next(undefined);
    this.unsubscribe.complete();
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  ngAfterViewInit() { }
  ngAfterContentInit() { }
  ngAfterViewChecked() { }
  ngAfterContentChecked() { }
  ngDoCheck() { }
  ngOnChanges() { }

  protected openNewTab(route: string) {
    if (window.electronAPI?.openWindow) {
      window.electronAPI.openWindow(route); // Electron
    } else {
      window.open(route, '_blank'); // Web
    }
  }


  protected checkUserType(userType: UserTypeEnum): boolean {
    const profile = this.userProfile$.getValue();
    if (profile) {
      return profile.type === userType;
    }
    return false;
  }

  get widthForModal(): string {
    // dựa theo size của tailwind để đặt width cho modal
    if (window.innerWidth < 640) {
      return '100%'; // sm
    }
    if (window.innerWidth < 768) {
      return '90%'; // md
    }
    if (window.innerWidth < 1024) {
      return '80%'; // lg
    }
    if (window.innerWidth < 1280) {
      return '60%'; // xl
    }
    if (window.innerWidth < 1536) {
      return '50%'; // 2xl
    }
    return '40%'; // default for larger screens
  }

  // use for nz-input-number VND formatting/parsing
  formatterVND = (value: number): string => {
    if (value === null || value === undefined) return '';
    return value
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse: 10,000 -> 10000
  parserVND = (value: string): number => {
    return Number(value?.replace(/,/g, '')) || 0;
  };

  protected isImageFile(fileName: string): boolean {
    if (!fileName) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? imageExtensions.includes(extension) : false;
  }

  downloadFileFromBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
