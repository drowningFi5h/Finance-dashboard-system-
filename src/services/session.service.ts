import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import type { UserRole } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";

type SessionInsertRow = {
  id: string;
  expires_at: string;
  last_activity_at: string;
};

const idleTimeoutByRole: Record<UserRole, number> = {
  viewer: env.IDLE_TIMEOUT_VIEWER_MINUTES,
  analyst: env.IDLE_TIMEOUT_ANALYST_MINUTES,
  admin: env.IDLE_TIMEOUT_ADMIN_MINUTES
};

export function getIdleTimeoutMinutes(role: UserRole): number {
  return idleTimeoutByRole[role];
}

export async function createSession(userId: string, roleSnapshot: UserRole): Promise<SessionInsertRow> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("user_sessions")
    .insert({
      user_id: userId,
      role_snapshot: roleSnapshot,
      last_activity_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    })
    .select("id,expires_at,last_activity_at")
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED", error?.message);
  }

  return data as SessionInsertRow;
}

export async function touchSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("user_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (error) {
    throw new ApiError(500, "Failed to update session activity", "SESSION_TOUCH_FAILED", error.message);
  }
}

export async function revokeSessionById(sessionId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason
    })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (error) {
    throw new ApiError(500, "Failed to revoke session", "SESSION_REVOKE_FAILED", error.message);
  }
}

export async function revokeAllSessionsForUser(userId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason
    })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new ApiError(500, "Failed to revoke user sessions", "SESSION_BULK_REVOKE_FAILED", error.message);
  }
}
