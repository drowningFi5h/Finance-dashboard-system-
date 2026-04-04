import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

import { env } from "../config/env.js";
import type { UserRole } from "../types/domain.js";

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  role: UserRole;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const expiresIn = env.JWT_EXPIRES_IN as StringValue;

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (!decoded.sub || !decoded.sid || !decoded.role) {
    throw new Error("Missing token claims");
  }

  return {
    sub: String(decoded.sub),
    sid: String(decoded.sid),
    role: decoded.role as UserRole
  };
}
