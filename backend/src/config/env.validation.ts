type EnvShape = Record<string, string | undefined>;

export function validateEnv(env: EnvShape) {
  const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return env;
}
