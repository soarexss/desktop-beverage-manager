type EnvShape = Record<string, string | undefined>;

export function validateEnv(env: EnvShape) {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (env.NODE_ENV === 'production') {
    if (
      !env.CORS_ORIGIN ||
      env.CORS_ORIGIN.split(',').some(
        (origin) => !origin.trim().startsWith('https://'),
      )
    )
      throw new Error('Production requires HTTPS CORS_ORIGIN');
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'])
      if ((env[key]?.length ?? 0) < 32)
        throw new Error(`${key} must have at least 32 characters`);
    if (env.JWT_SECRET === env.JWT_REFRESH_SECRET)
      throw new Error('JWT keys must differ');
  }
  return env;
}
