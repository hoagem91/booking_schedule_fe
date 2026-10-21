import { Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { BookingSchedule, BookingService, BookingSpecialty, BookingTimeSlot } from '../../models/booking.model';
import { decodeAppointmentText } from '../../utils/appointment-ui.utils';

@Component({
  selector: 'app-booking-summary', standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './booking-summary.html', styleUrl: './booking-summary.css'
})
export class BookingSummary {
  readonly booked = input<AppointmentHistoryItem | null>(null);
  readonly specialty = input<BookingSpecialty | null>(null);
  readonly service = input<BookingService | null>(null);
  readonly schedule = input<BookingSchedule | null>(null);
  readonly slot = input<BookingTimeSlot | null>(null);
  readonly date = input('');
  readonly decodeText = decodeAppointmentText;
}
