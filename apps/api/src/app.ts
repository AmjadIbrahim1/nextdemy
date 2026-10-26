import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import morgan from "morgan";
import env from "./configs/env";
// Routes
import authRoutes from "./modules/auth/auth.routes";
import contactRoutes from "./modules/contact/contact.routes";
import courseRoutes from "./modules/course/course.routes";
import healthRoutes from "./modules/health/health.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import profileRoutes from "./modules/profile/profile.routes";
import uploadRoutes from "./modules/upload/upload.routes";
// Middlewares
import { errorHandler } from "./shared/middlewares/error-handler";
import { notFoundHandler } from "./shared/middlewares/not-found-handler";
import { rateLimiter } from "./shared/middlewares/rate-limiter";
import { ApiError } from "./shared/utils/api-error";

const app: Express = express();

app.disable("x-powered-by");
// Render/Vercel terminate TLS in front of the app, so Express must trust the
// proxy hop for req.ip, secure cookies, and rate limiting to behave correctly.
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (Next.js rewrite proxy) and server-to-server calls
      // do not send an Origin header.
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      if (
        env.ALLOW_VERCEL_PREVIEWS &&
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "Origin is not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan(env.IS_PRODUCTION ? "combined" : "dev"));

// Rate limiting is applied to all requests; sensitive routes add stricter limits.
app.use(rateLimiter);

// ROUTES
app.get("/", (_req: Request, res: Response) => {
  res.redirect("/api/v2/health");
});

app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/course", courseRoutes);
app.use("/api/v2/payment", paymentRoutes);
app.use("/api/v2/profile", profileRoutes);
app.use("/api/v2/contact", contactRoutes);
app.use("/api/v2/health", healthRoutes);
app.use("/api/v2/upload", uploadRoutes);

// Not found handler (should be after routes)
app.use(notFoundHandler);

// Global error handler (should be last)
app.use(errorHandler);

export default app;
