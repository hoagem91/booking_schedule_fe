export interface LoginRequest { username: string; password: string; }
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: Gender;
}
export interface LoginResponse {
  token: string;
  expiryTime: string;
  authenticated: boolean;
  userId: number;
  patientId: number | null;
}
export type BookingApiResponse<T> = import('./api-response.model').ApiResponse<T>;
export interface RefreshTokenRequest { token: string; }
export interface ChangePasswordRequest { passwordOld: string; passwordNew: string; userId: number; }
