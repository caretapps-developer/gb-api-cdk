import { EnvironmentConfig } from './types';

export const productionConfig: EnvironmentConfig = {
  env: {
    account: process.env.PROD_ACCOUNT_ID || '222222222222',
    region: process.env.PROD_REGION || 'us-west-2',
  },
  environment: 'production',
  tags: {
    Environment: 'production',
    Project: 'gb2-api',
  },
  api: {
    stage: 'prod',
    domain: 'api.example.com',
    apiKeys: [
      {
        name: 'prod-api-key',
        description: 'API Key for production environment',
        enabled: true,
      },
    ],
  },
  cognito: {
    userPoolName: 'gb2-api-prod-user-pool',
    clientName: 'gb2-api-prod-client',
    callbackUrls: ['https://example.com/callback'],
    logoutUrls: ['https://example.com/logout'],
  },
}; 