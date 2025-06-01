export interface EnvironmentConfig {
  env: {
    account: string;
    region: string;
  };
  environment: string;
  tags: {
    Environment: string;
    Project: string;
  };
  api: {
    stage: string;
    domain: string;
    apiKeys: {
      name: string;
      description: string;
      enabled: boolean;
    }[];
  };
  cognito: {
    userPoolName: string;
    clientName: string;
    callbackUrls: string[];
    logoutUrls: string[];
  };
} 