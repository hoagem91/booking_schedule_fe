import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDateDisplay',
  standalone: true
})
export class DateDisplayPipe implements PipeTransform {
  transform(value: string | null): string {
    if (!value) {
      return '';
    }
    try {
      const date = new Date(value);
      const day = ('0' + date.getDate()).slice(-2);
      const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are zero-based
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Invalid date format:', value, error);
      return value; // Return original value if parsing fails
    }
  }
}

@Pipe({
  name: 'formatDateTimeDisplay',
  standalone: true
})
export class DateTimeDisplayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    try {
      const date = new Date(value);
      const hours = ('0' + date.getHours()).slice(-2);
      const minutes = ('0' + date.getMinutes()).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are zero-based
      const year = date.getFullYear();

      return `${hours}:${minutes} ${day}-${month}-${year}`;
    } catch (error) {
      console.error('Invalid date-time format:', value, error);
      return value; // Return original value if parsing fails
    }
  }
}

@Pipe({
  name: 'formatTimeDisplayByDateObj',
  standalone: true
})
export class TimeDisplayPipeByDateObj implements PipeTransform {
  transform(value: Date | null): string {
    if (!value) {
      return '';
    }
    try {
      const hours = ('0' + value.getHours()).slice(-2);
      const minutes = ('0' + value.getMinutes()).slice(-2);
      const day = ('0' + value.getDate()).slice(-2);
      const month = ('0' + (value.getMonth() + 1)).slice(-2); // Months are zero-based
      const year = value.getFullYear();

      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch (error) {
      console.error('Invalid date format:', value, error);
      return value as any; // Return original value if parsing fails
    }
  }
}
@Pipe({
  name: 'formatTimeDisplay',
  standalone: true
})
export class TimeDisplayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    try {
      const date = new Date(value);
      const hours = ('0' + date.getHours()).slice(-2);
      const minutes = ('0' + date.getMinutes()).slice(-2);
      const seconds = ('0' + date.getSeconds()).slice(-2);

      return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Invalid time format:', value, error);
      return value;
    }
  }
}
