export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRATION: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  GEMINI_API_KEY?: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = requiredEnvVars.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `[SECURITY ERROR] Missing mandatory environment variables: ${missing.join(', ')}. ` +
      `System cannot start without explicit configuration. Check your .env file.`
    );
  }

  // Ensure JWT Secrets meet minimum security length (at least 32 characters)
  const jwtSecret = config['JWT_SECRET'] as string;
  const jwtRefreshSecret = config['JWT_REFRESH_SECRET'] as string;

  if (jwtSecret.length < 32) {
    throw new Error('[SECURITY ERROR] JWT_SECRET must be at least 32 characters long for high cryptographic entropy.');
  }

  if (jwtRefreshSecret.length < 32) {
    throw new Error('[SECURITY ERROR] JWT_REFRESH_SECRET must be at least 32 characters long for high cryptographic entropy.');
  }

  return {
    NODE_ENV: (config['NODE_ENV'] as string) || 'development',
    PORT: Number(config['PORT']) || 3000,
    DATABASE_URL: config['DATABASE_URL'] as string,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRATION: (config['JWT_EXPIRATION'] as string) || '15m',
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRATION: (config['JWT_REFRESH_EXPIRATION'] as string) || '7d',
    REDIS_HOST: (config['REDIS_HOST'] as string) || 'localhost',
    REDIS_PORT: Number(config['REDIS_PORT']) || 6379,
    REDIS_PASSWORD: config['REDIS_PASSWORD'] as string | undefined,
    GEMINI_API_KEY: config['GEMINI_API_KEY'] as string | undefined,
  };
}
