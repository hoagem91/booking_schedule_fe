export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  pageMain: string;
  token: string;
  username: string;
  userType: number;
  expiredAt: string;
  refreshToken: string;
  refreshTokenExpiredAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  passwordOld: string;
  passwordNew: string;
  userId: number;
}