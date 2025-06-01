import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { EnvironmentConfig } from '../config/environments/types';
import { apiConfig } from '../config/api/endpoints';
import { findOrCreateLambdaRepo } from './services/github';

export class Gb2ApiCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, config: EnvironmentConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    // Apply environment tags to all resources in this stack
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', config.tags.Project);

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: config.cognito.userPoolName,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Create Cognito App Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: config.cognito.clientName,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        callbackUrls: config.cognito.callbackUrls,
        logoutUrls: config.cognito.logoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // Create Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${config.environment}-api`,
      description: `API Gateway for ${config.environment} environment`,
      deployOptions: {
        stageName: '',
      },
    });

    // Create API keys
    const apiKeys = config.api.apiKeys.map((keyConfig, index) => {
      const apiKey = new apigateway.ApiKey(this, `ApiKey${index}`, {
        apiKeyName: keyConfig.name,
        description: keyConfig.description,
        enabled: keyConfig.enabled,
      });

      // Create usage plan for the API key
      const usagePlan = new apigateway.UsagePlan(this, `UsagePlan${index}`, {
        name: `${keyConfig.name}-usage-plan`,
        description: `Usage plan for ${keyConfig.name}`,
        apiStages: [
          {
            api,
            stage: api.deploymentStage,
          },
        ],
        throttle: {
          rateLimit: 100,
          burstLimit: 200,
        },
        quota: {
          limit: 1000000,
          period: apigateway.Period.MONTH,
        },
      });

      // Associate the API key with the usage plan
      usagePlan.addApiKey(apiKey);

      return { apiKey, usagePlan };
    });

    // Create Lambda layers
    const layers = new Map<string, lambda.LayerVersion>();
    apiConfig.layers.forEach((layerConfig) => {
      const layer = new lambda.LayerVersion(this, layerConfig.name, {
        layerVersionName: `${config.environment}-${layerConfig.name}`,
        description: layerConfig.description,
        code: lambda.Code.fromAsset('src/layer-placeholder'),
        compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      });
      layers.set(layerConfig.name, layer);
    });

    // Create Lambda functions and API endpoints
    const resourceMethods = new Map<string, Set<string>>();
    const resourcesWithCors = new Set<string>();
    
    // First pass: collect all methods for each resource
    apiConfig.endpoints.forEach((endpoint) => {
      if (endpoint.lambdaFunction) {
        const methods = resourceMethods.get(endpoint.path) || new Set<string>();
        methods.add(endpoint.method);
        resourceMethods.set(endpoint.path, methods);
        
        if (endpoint.cors ?? apiConfig.defaults.cors) {
          resourcesWithCors.add(endpoint.path);
        }
      }
    });

    // Second pass: create Lambda functions and add methods
    apiConfig.endpoints.forEach(async (endpoint) => {
      if (endpoint.lambdaFunction) {
        // Get Lambda layers for this function
        const functionLayers = endpoint.lambdaFunction.layers
          ?.map(layerName => layers.get(layerName))
          .filter((layer): layer is lambda.LayerVersion => layer !== undefined) || [];

        // Create Lambda function
        const lambdaFn = new lambda.Function(this, endpoint.lambdaFunction.name, {
          functionName: `${config.environment}-${endpoint.lambdaFunction.name}`,
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: 'index.handler',
          code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Placeholder" });'),
          memorySize: endpoint.lambdaFunction.memorySize ?? apiConfig.defaults.lambdaFunction.memorySize,
          timeout: cdk.Duration.seconds(
            endpoint.lambdaFunction.timeout ?? apiConfig.defaults.lambdaFunction.timeout
          ),
          environment: {
            ...endpoint.lambdaFunction.environment,
            FUNCTION_NAME: endpoint.lambdaFunction.name,
          },
          layers: functionLayers,
        });

        // Create API Gateway resource and method
        const resource = api.root.resourceForPath(endpoint.path);
        resource.addMethod(endpoint.method, new apigateway.LambdaIntegration(lambdaFn), {
          authorizer: (endpoint.requireCognitoAuth ?? apiConfig.defaults.requireCognitoAuth) ? authorizer : undefined,
          apiKeyRequired: endpoint.apiKeyRequired ?? apiConfig.defaults.apiKeyRequired,
        });

        // Find or create Lambda repo
        await findOrCreateLambdaRepo(endpoint.lambdaFunction.name);
      }
    });

    // Third pass: add CORS preflight for resources that need it
    resourcesWithCors.forEach((path) => {
      const resource = api.root.resourceForPath(path);
      const methods = resourceMethods.get(path);
      if (methods) {
        resource.addCorsPreflight({
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: Array.from(methods),
          allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Amz-Date',
            'X-Api-Key',
            'X-Amz-Security-Token',
            'X-Amz-User-Agent',
          ],
          allowCredentials: true,
        });
      }
    });

    // Create ACM Certificate for custom domain
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: config.api.domain,
      validation: acm.CertificateValidation.fromDns(),
    });

    // Create custom domain for API Gateway
    const domain = new apigateway.DomainName(this, 'CustomDomain', {
      domainName: config.api.domain,
      certificate,
      endpointType: apigateway.EndpointType.REGIONAL,
    });

    // Create base mapping for the API
    domain.addBasePathMapping(api, {
      basePath: '',
      stage: api.deploymentStage,
    });

    // Create Route53 hosted zone (if it doesn't exist)
    const hostedZone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: config.api.domain,
    });

    // Create A record for the custom domain
    new route53.ARecord(this, 'ApiAliasRecord', {
      recordName: config.api.domain,
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(domain)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway Endpoint URL',
    });

    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: `https://${config.api.domain}`,
      description: 'Custom Domain URL',
    });

    // Output API keys
    apiKeys.forEach(({ apiKey }, index) => {
      new cdk.CfnOutput(this, `ApiKey${index}Id`, {
        value: apiKey.keyId,
        description: `API Key ID for ${config.api.apiKeys[index].name}`,
      });
    });
  }
}
