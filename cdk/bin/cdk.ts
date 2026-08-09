#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { ValheimMonitorStack } from '../lib/cdk-stack';

const app = new cdk.App();
new ValheimMonitorStack(app, 'ValheimMonitor', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});
