// import * as crypt from "crypto";

/**
 *
 * @returns  a 6 digit token
 */
export function generateToken(): string {
  // return crypt.randomBytes(6).toString('hex');
  return Math.floor(100000 + Math.random() * 900000).toString();
}
