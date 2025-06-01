import { EnvironmentConfig } from './types';

export const sandboxConfig: EnvironmentConfig = {
  env: {
    account: process.env.SANDBOX_ACCOUNT_ID || '638289097357',
    region: process.env.SANDBOX_REGION || 'us-west-2',
  },
  environment: 'sandbox',
  tags: {
    Environment: 'sandbox',
    Project: 'gb2-api',
  },
  api: {
    stage: 'sandbox',
    domain: 'api-sandbox.example.com',
    apiKeys: [
      {
        name: 'sandbox-api-key',
        description: 'API Key for sandbox environment',
        enabled: true,
      },
    ],
  },
  cognito: {
    userPoolName: 'gb2-api-sandbox-user-pool',
    clientName: 'gb2-api-sandbox-client',
    callbackUrls: ['https://sandbox.example.com/callback'],
    logoutUrls: ['https://sandbox.example.com/logout'],
  },
}; 