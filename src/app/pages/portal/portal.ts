import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SiteFooter } from '../../components/site-footer/site-footer';
import { SiteHeader } from '../../components/site-header/site-header';
import { SITE_INFO } from '../../constants/site-info';
import { AppointmentService } from '../../services/appointment/appointment.service';
import { BookingService, BookingSpecialty } from '../../models/booking.model';
import { appointmentResponseSucceeded, decodeAppointmentText } from '../../utils/appointment/appointment-ui.utils';

@Component({
  selector: 'app-portal', standalone: true,
  imports: [SiteHeader, SiteFooter, RouterLink, FormsModule, CurrencyPipe],
  templateUrl: './portal.html',
  styleUrl: './portal.css'
})
export class Portal {
  private readonly api = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);
  readonly specialties = signal<BookingSpecialty[]>([]);
  readonly services = signal<BookingService[]>([]);
  readonly loadingSpecialties = signal(false);
  readonly loadingServices = signal(false);
  readonly specialtyError = signal('');
  readonly serviceError = signal('');
  readonly selectedSpecialty = signal<number | null>(null);
  readonly query = signal('');
  readonly expanded = signal(false);
  readonly decode = decodeAppointmentText;
  readonly currentYear = new Date().getFullYear();
  readonly site = SITE_INFO;
  readonly filteredServices = computed(() => {
    const query = this.normalize(this.query());
    const specialtyId = this.selectedSpecialty();
    return this.services().filter(item =>
      (specialtyId === null || item.specialtyId === specialtyId || item.specialtyId === null)
      && (!query || this.normalize(`${item.name} ${this.specialtyName(item)} ${item.description ?? ''}`).includes(query)));
  });
  // The public API has no featured/popularity flag. Preview follows catalog order.
  readonly visibleServices = computed(() => this.expanded()
    ? this.filteredServices() : this.filteredServices().slice(0, 6));

  constructor() {
    afterNextRender(() => { this.loadSpecialties(); this.loadServices(); });
  }

  loadSpecialties(): void {
    if (this.loadingSpecialties()) return;
    this.loadingSpecialties.set(true);
    this.specialtyError.set('');
    this.api.getSpecialties().pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingSpecialties.set(false))).subscribe({
      next: response => {
        if (appointmentResponseSucceeded(response) && Array.isArray(response.result)) {
          this.specialties.set(response.result);
        } else this.specialtyError.set('Chưa thể tải chuyên khoa. Vui lòng thử lại.');
      },
      error: () => this.specialtyError.set('Chưa thể tải chuyên khoa. Vui lòng thử lại.')
    });
  }

  loadServices(): void {
    if (this.loadingServices()) return;
    this.loadingServices.set(true);
    this.serviceError.set('');
    this.api.getServices().pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingServices.set(false))).subscribe({
      next: response => {
        if (appointmentResponseSucceeded(response) && Array.isArray(response.result)) {
          this.services.set(response.result);
        } else this.serviceError.set('Chưa thể tải dịch vụ. Vui lòng thử lại.');
      },
      error: () => this.serviceError.set('Chưa thể tải dịch vụ. Vui lòng thử lại.')
    });
  }

  filterSpecialty(id: number | null): void {
    this.selectedSpecialty.set(id);
    this.expanded.set(false);
  }

  specialtyName(service: BookingService): string {
    return this.decode(service.specialtyName
      || this.specialties().find(item => item.id === service.specialtyId)?.name
      || (service.specialtyId === null ? 'Dịch vụ chung' : 'Dịch vụ khám'));
  }

  bookingParams(service: BookingService) {
    return { serviceId: service.id, specialtyId: service.specialtyId ?? this.selectedSpecialty() };
  }

  canBook(service: BookingService): boolean {
    return service.price !== null && Number.isFinite(service.price) && service.price >= 0;
  }

  private normalize(value: string): string {
    return this.decode(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }
}
