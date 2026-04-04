import { Router } from "express";

import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { recordRouter } from "./record.routes.js";
import { userRouter } from "./user.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/records", recordRouter);
apiRouter.use("/dashboard", dashboardRouter);
