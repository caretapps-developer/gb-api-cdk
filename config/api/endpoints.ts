import { ApiConfig } from './types';

export const apiConfig: ApiConfig = {
  defaults: {
    lambdaFunction: {
      memorySize: 256,
      timeout: 30,
    },
    requireCognitoAuth: true,
    apiKeyRequired: true,
    cors: true,
  },
  layers: [
    {
      name: 'common-utils',
      description: 'Common utility functions and helpers',
      codePath: 'lambda/layers/common-utils',
    },
    {
      name: 'database-helpers',
      description: 'Database access and query helpers',
      codePath: 'lambda/layers/database-helpers',
    },
    {
      name: 'auth-helpers',
      description: 'Authentication and authorization helpers',
      codePath: 'lambda/layers/auth-helpers',
    },
  ],
  endpoints: [
    // Users endpoints
    {
      path: '/users',
      method: 'GET',
      lambdaFunction: {
        name: 'get-users',
        environment: {
          TABLE_NAME: 'users-table',
        },
        layers: ['common-utils', 'database-helpers'],
      },
    },
    {
      path: '/users',
      method: 'POST',
      lambdaFunction: {
        name: 'create-user',
        environment: {
          TABLE_NAME: 'users-table',
        },
        layers: ['common-utils', 'database-helpers', 'auth-helpers'],
      },
      requireCognitoAuth: false,
    },
    {
      path: '/users/{userId}',
      method: 'GET',
      lambdaFunction: {
        name: 'get-user',
        environment: {
          TABLE_NAME: 'users-table',
        },
        layers: ['common-utils', 'database-helpers'],
      },
    },

    // Products endpoints
    {
      path: '/products',
      method: 'GET',
      lambdaFunction: {
        name: 'get-products',
        environment: {
          TABLE_NAME: 'products-table',
        },
        layers: ['common-utils', 'database-helpers'],
      },
      requireCognitoAuth: false,
    },
    {
      path: '/products',
      method: 'POST',
      lambdaFunction: {
        name: 'create-product',
        environment: {
          TABLE_NAME: 'products-table',
        },
        layers: ['common-utils', 'database-helpers', 'auth-helpers'],
      },
    },

    // Orders endpoints
    {
      path: '/orders',
      method: 'GET',
      lambdaFunction: {
        name: 'get-orders',
        environment: {
          TABLE_NAME: 'orders-table',
        },
        layers: ['common-utils', 'database-helpers'],
      },
    },
    {
      path: '/orders',
      method: 'POST',
      lambdaFunction: {
        name: 'create-order',
        environment: {
          TABLE_NAME: 'orders-table',
        },
        layers: ['common-utils', 'database-helpers', 'auth-helpers'],
      },
    },
    {
      path: '/api/admin/auth/login',
      method: 'POST',
      lambdaFunction: {
        name: 'api-admin-auth-login',
        environment: {},
      },
    },
  ],
}; 