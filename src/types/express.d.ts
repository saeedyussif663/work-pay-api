import { SignedUser } from '.';

declare global {
  namespace Express {
    interface Request {
      user?: SignedUser;
    }
  }
}

export {};
