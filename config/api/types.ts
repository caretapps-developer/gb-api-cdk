export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface LambdaLayer {
  name: string;
  description: string;
  compatibleRuntimes?: string[];
  codePath: string;
}

export interface LambdaFunction {
  name: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
  layers?: string[]; // Array of layer names to use
}

export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  lambdaFunction?: LambdaFunction;
  requireCognitoAuth?: boolean;
  apiKeyRequired?: boolean;
  cors?: boolean;
}

export interface ApiDefaults {
  lambdaFunction: {
    memorySize: number;
    timeout: number;
  };
  requireCognitoAuth: boolean;
  apiKeyRequired: boolean;
  cors: boolean;
}

export interface ApiConfig {
  defaults: ApiDefaults;
  layers: LambdaLayer[];
  endpoints: ApiEndpoint[];
} 