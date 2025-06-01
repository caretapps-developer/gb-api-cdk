import { EnvironmentConfig } from './types';
import { sandboxConfig } from './sandbox';
import { productionConfig } from './production';

export type { EnvironmentConfig };

export const environments: { [key: string]: EnvironmentConfig } = {
  sandbox: sandboxConfig,
  production: productionConfig,
}; 