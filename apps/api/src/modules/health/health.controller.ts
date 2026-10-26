import type { Request, Response } from "express";
import { isDatabaseConnected } from "@/configs/db";
import { asyncHandler } from "../../shared/utils/async-handler";

/**
 * Health check used by Render. Returns 503 when MongoDB is unavailable so a
 * broken instance is not reported as healthy.
 */
export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const databaseConnected = isDatabaseConnected();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? "Service is healthy"
      : "Service is starting or the database is unavailable",
    data: {
      status: databaseConnected ? "healthy" : "degraded",
      database: databaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * Detailed health check with system information.
 */
export const detailedHealthCheck = asyncHandler(
  async (_req: Request, res: Response) => {
    const databaseConnected = isDatabaseConnected();
    const healthData = {
      status: databaseConnected ? "healthy" : "degraded",
      database: databaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
        unit: "MB",
      },
    };

    res.status(databaseConnected ? 200 : 503).json({
      success: databaseConnected,
      message: databaseConnected
        ? "Service is healthy"
        : "Service is starting or the database is unavailable",
      data: healthData,
    });
  }
);
