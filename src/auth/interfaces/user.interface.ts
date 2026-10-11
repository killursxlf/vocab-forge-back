export interface User {
  userId: number;
  email: string;
  name?: string | null;
  tokenVersion: number;
}
