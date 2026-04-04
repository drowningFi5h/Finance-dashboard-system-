import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/require-role.js";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRoles("viewer", "analyst", "admin"));

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const summary = await getDashboardSummary();

    res.status(200).json({
      success: true,
      data: summary
    });
  })
);
