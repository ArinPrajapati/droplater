import rateLimit from "express-rate-limit"

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 15 minutes
    max: 60,
    message: { error: "Too many requests, please try again later." },
});



