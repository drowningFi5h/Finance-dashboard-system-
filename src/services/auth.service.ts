import { comparePassword } from "../lib/password.js";
import { signAccessToken } from "../lib/jwt.js";
import { supabase } from "../lib/supabase.js";
import type { UserRole, UserStatus } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";
import { logAudit } from "./audit.service.js";
import { createSession, revokeSessionById } from "./session.service.js";

type LoginInput = {
  email: string;
  password: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
};

export async function login(input: LoginInput) {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,password_hash,role,status")
    .eq("email", input.email)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to fetch user", "USER_LOOKUP_FAILED", error.message);
  }

  if (!data) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const user = data as UserRow;

  const passwordOk = await comparePassword(input.password, user.password_hash);
  if (!passwordOk) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "User account is inactive", "USER_INACTIVE");
  }

  const session = await createSession(user.id, user.role);
  const token = signAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.role
  });

  await logAudit({
    action: "LOGIN",
    actorId: user.id,
    targetType: "session",
    targetId: session.id,
    details: {
      role: user.role
    }
  });

  return {
    token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
}

export async function logout(sessionId: string, actorId: string): Promise<void> {
  await revokeSessionById(sessionId, "manual_logout");

  await logAudit({
    action: "LOGOUT",
    actorId,
    targetType: "session",
    targetId: sessionId
  });
}
