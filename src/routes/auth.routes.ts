import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema } from "../schemas/auth.schema.js";
import { login, logout } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await login(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await logout(req.auth!.sessionId, req.auth!.user.id);

    res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      data: req.auth!.user
    });
  })
);
