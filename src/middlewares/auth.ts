import type { RequestHandler } from "express";

import { supabase } from "../lib/supabase.js";
import type { UserRole, UserStatus } from "../types/domain.js";
import { getIdleTimeoutMinutes, revokeSessionById, touchSession } from "../services/session.service.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

type SessionRow = {
  id: string;
  user_id: string;
  last_activity_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Missing or invalid authorization header", "AUTH_REQUIRED");
    }

    const token = authHeader.slice("Bearer ".length).trim();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, "Invalid or expired token", "INVALID_TOKEN");
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id,user_id,last_activity_at,expires_at,revoked_at")
      .eq("id", payload.sid)
      .maybeSingle();

    if (sessionError || !sessionData) {
      throw new ApiError(401, "Session not found", "SESSION_NOT_FOUND");
    }

    const session = sessionData as SessionRow;

    if (session.user_id !== payload.sub) {
      throw new ApiError(401, "Token/session mismatch", "SESSION_MISMATCH");
    }

    if (session.revoked_at) {
      throw new ApiError(401, "Session has been revoked", "SESSION_REVOKED");
    }

    const now = Date.now();
    if (new Date(session.expires_at).getTime() <= now) {
      await revokeSessionById(session.id, "session_expired");
      throw new ApiError(401, "Session expired. Please login again", "SESSION_EXPIRED");
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id,name,email,role,status")
      .eq("id", payload.sub)
      .maybeSingle();

    if (userError || !userData) {
      throw new ApiError(401, "User not found", "USER_NOT_FOUND");
    }

    const user = userData as UserRow;
    if (user.status !== "active") {
      await revokeSessionById(session.id, "inactive_user");
      throw new ApiError(403, "User is inactive", "USER_INACTIVE");
    }

    const idleTimeoutMinutes = getIdleTimeoutMinutes(user.role);
    const idleExpiryAt = new Date(session.last_activity_at).getTime() + idleTimeoutMinutes * 60 * 1000;

    if (idleExpiryAt <= now) {
      await revokeSessionById(session.id, "idle_timeout");
      throw new ApiError(
        401,
        "Session timed out due to inactivity. Please login again",
        "SESSION_IDLE_TIMEOUT"
      );
    }

    await touchSession(session.id);

    req.auth = {
      user,
      sessionId: session.id
    };

    next();
  } catch (error) {
    next(error);
  }
};
