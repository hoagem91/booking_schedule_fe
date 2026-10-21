export class ApiConstants{
  public static readonly API_PATIENT_APPOINTMENTS = '/api/patient/appointments';
  public static readonly API_PUBLIC_SPECIALTIES = '/api/public/specialties';
  public static readonly API_PUBLIC_SERVICES = '/api/public/services';
  public static readonly API_PUBLIC_SCHEDULES = '/api/public/doctor-schedules/search';
  public static readonly API_PUBLIC_TIME_SLOTS = '/api/public/time-slots';
  public static readonly API_APPOINTMENT_MY_HISTORY = '/api/patient/appointments/my-history';
  public static readonly API_PATIENT_ME = '/patients/me';

  private static API(path:string): string {return `/${path}`}

  // auth
  private static AUTH(path:string): string {return this.API(`auth/${path}`);}
  public static readonly API_AUTH_LOGIN = this.AUTH('token');
  public static readonly API_AUTH_LOGOUT = this.AUTH('logout');
  public static readonly API_AUTH_REGISTER = this.AUTH('register');
  public static readonly API_AUTH_REFRESH_TOKEN = this.AUTH('refresh');

  private static API_ADMIN(path:string) : string {return `/api/admin/${path}`}
  // appointment
  private static APPOINTMENT_ADMIN(path = ''):string {return this.API_ADMIN(path ? `appointments/${path}` : 'appointments');}
  public static readonly API_APPOINTMENT_ADMIN_SEARCH = this.APPOINTMENT_ADMIN('search');
  public static readonly API_APPOINTMENT_ADMIN_DETAIL = this.APPOINTMENT_ADMIN();
}
