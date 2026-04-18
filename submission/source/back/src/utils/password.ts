import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/** Hash a plain-text password */
export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

/** Compare plain password against stored hash */
export const verifyPassword = async (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
