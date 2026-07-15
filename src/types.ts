export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  action: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | '2FA_ENABLED' | '2FA_DISABLED' | '2FA_VERIFIED' | 'LOCKOUT' | 'SQL_INJECTION_ATTEMPT';
  ipAddress: string;
  userAgent: string;
  details: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  requires2FA?: boolean;
  tempEmail?: string; // used for holding email during 2FA step
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ServerResponse<T> {
  success: boolean;
  data?: T;
  user?: any;
  tempToken?: string;
  error?: string;
  errors?: ValidationError[];
  requires2FA?: boolean;
}
