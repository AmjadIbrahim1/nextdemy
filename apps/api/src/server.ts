import app from "./app";
import { connectDB } from "./configs/db";
import env from "./configs/env";
import { logger } from "./shared/utils/logger";
import { configureGracefulShutdown } from "./shared/utils/shutdown";

const start = async () => {
  try {
    await connectDB();
  } catch (error) {
    logger.fatal({ error }, "Could not connect to MongoDB; exiting");
    process.exit(1);
  }

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(
      {
        port: env.PORT,
        environment: env.NODE_ENV,
        paymentMode: env.PAYMENT_MODE,
      },
      "Nextdemy API listening"
    );
  });

  server.on("error", (error) => {
    logger.fatal({ error }, "HTTP server failed");
    process.exit(1);
  });

  configureGracefulShutdown(server);
};

start();
