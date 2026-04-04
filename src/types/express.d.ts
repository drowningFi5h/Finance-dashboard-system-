import type { UserRole, UserStatus } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          status: UserStatus;
        };
        sessionId: string;
      };
    }
  }
}

export {};
