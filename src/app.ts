import cors from "cors";
import express from "express";
import morgan from "morgan";
import type { Router } from "express";

import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";

export const app = express();

let apiRouter: Router | null = null;
let startupError: string | null = null;

try {
  const routesModule = await import("./routes/index.js");
  apiRouter = routesModule.apiRouter;
} catch (error) {
  startupError = error instanceof Error ? error.message : "Unknown startup error";
  console.error("API router failed to initialize", error);
}

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests"
  );
  next();
});
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(morgan("dev"));
app.use(express.json());

if (apiRouter) {
  app.use("/api", apiRouter);
} else {
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "degraded",
        message: "Server is up but API dependencies are not configured",
        startupError
      }
    });
  });

  app.use("/api", (_req, res) => {
    res.status(500).json({
      success: false,
      error: {
        code: "STARTUP_CONFIG_ERROR",
        message: "Backend failed to initialize required configuration",
        details: startupError
      }
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
