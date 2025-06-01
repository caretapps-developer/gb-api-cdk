#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Gb2ApiCdkStack } from '../src/gb2-api-cdk-stack';
import { environments } from '../config/environments';

const app = new cdk.App();

// Deploy sandbox stack
new Gb2ApiCdkStack(app, 'Gb2ApiCdkStack-Sandbox', environments.sandbox, {
  env: environments.sandbox.env,
});

// Deploy production stack
new Gb2ApiCdkStack(app, 'Gb2ApiCdkStack-Production', environments.production, {
  env: environments.production.env,
});