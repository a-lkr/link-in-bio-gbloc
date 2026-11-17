import { getAuth } from "../lib/auth";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const rateLimitResponse = {
  error: "Too many requests. Please try again shortly.",
};

function createRateLimit(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
  });
}

export const usernameAvailabilityLimiter = createRateLimit(60_000, 60);
export const publicProfileLimiter = createRateLimit(60_000, 120);
export const profileViewLimiter = createRateLimit(60_000, 30);
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
  keyGenerator: (req) => {
    const userId = getAuth(req).userId;
    if (userId) return `user:${userId}`;
    const requestIp = req.ip ?? req.socket.remoteAddress;
    return requestIp ? `ip:${ipKeyGenerator(requestIp)}` : "ip:unknown";
  },
});
export const profileReportLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
  keyGenerator: (req) => {
    const userId = getAuth(req).userId;
    if (userId) return `user:${userId}`;
    const requestIp = req.ip ?? req.socket.remoteAddress;
    return requestIp ? `ip:${ipKeyGenerator(requestIp)}` : "ip:unknown";
  },
});

export const authAttemptLimiter = createRateLimit(15 * 60_000, 10);
