import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { publicProfileShareRouter } from "./routes/profiles";
import { logger } from "./lib/logger";
import { authSessionMiddleware } from "./lib/auth";
import { stripeWebhookRouter } from "./routes/billing";

const app: Express = express();

// The app is reached through one ingress proxy; use its forwarded client IP
// rather than treating every visitor as the same proxy address.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use("/api/billing/stripe", stripeWebhookRouter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(publicProfileShareRouter);
app.use(authSessionMiddleware);

app.use("/api", router);

export default app;
