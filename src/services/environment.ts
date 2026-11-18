import { AppEnvironment, EnvironmentConfig } from '../types';

const ENV_STORAGE_KEY = 'app_environment_v1';

/**
 * Environment configuration for Staging vs Production
 */
export function getAppEnvironment(): EnvironmentConfig {
  let env: AppEnvironment = 'production';
  try {
    const stored = localStorage.getItem(ENV_STORAGE_KEY) as AppEnvironment;
    if (stored === 'staging' || stored === 'development' || stored === 'production') {
      env = stored;
    }
  } catch (e) {
    env = 'production';
  }

  const isProduction = env === 'production';

  return {
    current: env,
    // Separate database collections: Production uses 'user_notes', Staging uses 'staging_notes'
    dbCollection: isProduction ? 'user_notes' : 'staging_notes',
    isProduction,
    allowTelemetry: isProduction,
  };
}

/**
 * Switch environment mode (e.g. from Admin or Settings)
 */
export function setAppEnvironment(env: AppEnvironment): void {
  try {
    localStorage.setItem(ENV_STORAGE_KEY, env);
  } catch (e) {
    console.error('Failed to set environment:', e);
  }
}
