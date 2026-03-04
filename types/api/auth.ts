export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface SignupRequestDTO {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  token: string;
  expiresAt: string;
  requiresVerification?: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthErrorDTO {
  error: string;
  message?: string;
}
