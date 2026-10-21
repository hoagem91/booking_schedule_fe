export class TimeUtils {
  // convert date string to Date object
  public static convertTimeStringToTimeObject(dateString: string): Date {
    if(!dateString) return new Date();
    return new Date(dateString);
  }

  // convert date object to 04-10-2025 format
  public static convertTimeObjectToTimeStringFormatDDMMYYY(date: Date): string {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // convert date object to 2025-10-04T00:00:00Z format
  public static convertTimeObjectToTimeStringISO(date: Date): string {
    if (!date) return '';
    return date.toISOString();
  }

  public static getDateObjectToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  public static getStartOfDay(date: Date): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  public static getEndOfDay(date: Date): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  public static getStartOfMonth(date: Date): Date {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth;
  }

  public static getEndOfMonth(date: Date): Date {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  }

  public static getStartOfYear(date: Date): Date {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    return startOfYear;
  }

  public static getEndOfYear(date: Date): Date {
    const endOfYear = new Date(date.getFullYear(), 11, 31);
    endOfYear.setHours(23, 59, 59, 999);
    return endOfYear;
  }

  // convert date object to 2025-12-05T00:00:00+07:00 format
  public static convertTimeObjectToTimeStringWithTimezone(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
    const offsetSign = timezoneOffset >= 0 ? '+' : '-';

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  public static convertTimeObjectToTimeStringWithTimezoneWithoutT(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
    const offsetSign = timezoneOffset >= 0 ? '+' : '-';

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  // convert time object to HH:mm:ss format
  public static convertTimeObjectToTimeStringHHMMSS(date: Date): string {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // convert HH:mm:ss string to time object
  public static convertTimeStringHHMMSSToTimeObject(timeString: string): Date {
    const timeParts = timeString.split(':');
    if (timeParts.length !== 3) return new Date();
    const date = new Date();
    date.setHours(parseInt(timeParts[0], 10));
    date.setMinutes(parseInt(timeParts[1], 10));
    date.setSeconds(parseInt(timeParts[2], 10));
    date.setMilliseconds(0);
    return date;
  }

  // useForCallApi => convert date object to YYYY-MM-DD format
  public static convertTimeObjectToTimeStringYYYYMMDD(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // useForCallApi => convert date object to YYYY-MM-DD format
  public static convertTimeObjectToTimeStringYYYYMMDDhhmm(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /*
   * convert time range to string 2026-09-24,2026-09-26
   *
   */
  public static convertTimeRangeToStringYYYYMMDD_YYYMMDD(daterange: Date[] | null): string | null {
    return Array.isArray(daterange) && daterange.length === 2 && daterange.every(date =>
      date && !isNaN(new Date(date).getTime()))
      ? daterange.map(date => this.convertTimeObjectToTimeStringYYYYMMDD(new Date(date))).join(',')
      : null;
  }

  public static convertTimeRangeToStringYYYYMMDDhhmm(daterange: Date | null): string | null {
    return daterange && !isNaN(new Date(daterange).getTime())
      ? this.convertTimeObjectToTimeStringYYYYMMDDhhmm(new Date(daterange))
      : null;
  }

  // convert "2026-10-21,2026-10-25" to range date [new Date("2026-10-21T00:00:00.000Z"), new Date("2026-10-25T00:00:00.000Z")]
  public static convertStringRangeDateToRangeDate(dateArray: string[]): Date[] {
    if (!dateArray) return [];
    return dateArray.length === 2 && dateArray.every(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
      ? dateArray.map(date => new Date(`${date}T00:00:00`))
      : [];
  }

  public static convertStringRangeDateToRangeDatehhmm(dateArray: string[]): Date[] {
    if (!dateArray) return [];
    return dateArray.length === 2 && dateArray.every(date => /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(date))
      ? dateArray.map(date => new Date(`${date}`))
      : [];
  }
}
