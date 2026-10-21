import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SiteHeader } from '../../components/site-header/site-header';
import { PatientService } from '../../services/patient.service';
import { Gender } from '../../models/auth.model';

@Component({
  selector: 'app-profile', standalone: true,
  imports: [SiteHeader, RouterLink, RouterLinkActive, RouterOutlet, DatePipe],
  templateUrl: './profile.html', styleUrl: './profile.css',
})
export class Profile {
  private readonly router = inject(Router);
  private readonly navigation = toSignal(this.router.events.pipe(filter(event => event instanceof NavigationEnd)));
  readonly profile = inject(PatientService).currentProfile;
  readonly sectionTitle = computed(() => {
    this.navigation();
    const url = this.router.url.split(/[?#]/)[0];
    return /\/appointments(?:\/\d+)?$/.test(url) ? 'Lịch hẹn của tôi' : url.endsWith('/insurance') ? 'Bảo hiểm y tế' : 'Hồ sơ cá nhân';
  });

  genderLabel(value: Gender | null): string {
    return value === 'MALE' ? 'Nam' : value === 'FEMALE' ? 'Nữ' : value === 'OTHER' ? 'Khác' : 'Chưa cập nhật';
  }
}
