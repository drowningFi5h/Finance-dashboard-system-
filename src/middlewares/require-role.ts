import type { RequestHandler } from "express";

import type { UserRole } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";

export function requireRoles(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required", "AUTH_REQUIRED"));
      return;
    }

    if (!roles.includes(req.auth.user.role)) {
      next(new ApiError(403, "You do not have access to this action", "FORBIDDEN"));
      return;
    }

    next();
  };
}
