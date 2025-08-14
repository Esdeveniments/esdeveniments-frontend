export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: User;
  issuedAt: number; // epoch ms
}