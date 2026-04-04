import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
