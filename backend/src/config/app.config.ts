export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3001),
    logLevel: process.env.LOG_LEVEL ?? "info",
    jwtSecret: process.env.JWT_SECRET ?? "",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
    throttleTtl: Number(process.env.THROTTLE_TTL ?? 60),
    throttleLimit: Number(process.env.THROTTLE_LIMIT ?? 120),
    loginThrottleTtl: Number(process.env.LOGIN_THROTTLE_TTL ?? 60),
    loginThrottleLimit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 5),
    prismaConnectOnStart: process.env.PRISMA_CONNECT_ON_START ?? "true",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  },
});
