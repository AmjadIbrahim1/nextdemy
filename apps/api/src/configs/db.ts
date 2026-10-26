import mongoose from "mongoose";
import { logger } from "../shared/utils/logger";
import env from "./env";

const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 2_000;

let connectionPromise: Promise<typeof mongoose> | null = null;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const connectWithRetry = async (): Promise<typeof mongoose> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const connection = await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        retryWrites: true,
      });
      logger.info(
        { host: connection.connection.host, attempt },
        "MongoDB connected"
      );
      return connection;
    } catch (error) {
      lastError = error;
      logger.error(
        { attempt, maxAttempts: MAX_ATTEMPTS },
        "MongoDB connection attempt failed"
      );
      if (attempt < MAX_ATTEMPTS) {
        await wait(BASE_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("MongoDB connection failed");
};

export const connectDB = async (): Promise<void> => {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (error) => {
    logger.error({ error }, "MongoDB runtime error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected; the driver will reconnect automatically");
  });

  if (mongoose.connection.readyState === 1) {
    return;
  }

  connectionPromise ??= connectWithRetry();

  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

export const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;
