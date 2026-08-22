import { EndpointType, LambdaIntegration, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class ValheimLLMStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const defaultErrorLambda = new Function(this, 'DefaultErrorLambda', {
      runtime: Runtime.NODEJS_24_X,
      handler: 'index.handler',
      reservedConcurrentExecutions: 2,
      code: Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 404,
            body: JSON.stringify({
              errorMessage: 'Not Found'
            })
          }
        }
      `)
    });

    const stateTable = new Table(this, 'ValheimLLMStateTable', {
      partitionKey: { name: 'channelId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const workerLambda = new NodejsFunction(this, 'ValheimLLMWorkerLambda', {
      runtime: Runtime.NODEJS_24_X,
      handler: 'handler',
      depsLockFilePath: '../llm-lambda/package-lock.json',
      entry: '../llm-lambda/worker.ts',
      bundling: {
        minify: true,
        externalModules: [],
      },
      logGroup: new LogGroup(this, 'ValheimLLMWorkerLogGroup', {
        retention: RetentionDays.THREE_DAYS
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: {
        STATE_TABLE_NAME: stateTable.tableName,
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'google.gemma-4-31b'
      }
    });

    stateTable.grantReadWriteData(workerLambda);

    workerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock-mantle:*',
        ],
        resources: ['*'],
      })
    );

    const llmLambda = new NodejsFunction(this, 'ValheimLLMLambda', {
      runtime: Runtime.NODEJS_24_X,
      handler: 'handler',
      depsLockFilePath: '../llm-lambda/package-lock.json',
      entry: '../llm-lambda/handler.ts',
      bundling: {
        minify: true,
        externalModules: [],
      },
      logGroup: new LogGroup(this, 'ValheimLLMLogGroup', {
        retention: RetentionDays.THREE_DAYS
      }),
      reservedConcurrentExecutions: 1,
      timeout: cdk.Duration.seconds(30),
      environment: {
        WORKER_LAMBDA_NAME: workerLambda.functionName,
        STATE_TABLE_NAME: stateTable.tableName,
      }
    });

    stateTable.grantReadWriteData(llmLambda);
    workerLambda.grantInvoke(llmLambda);

    const secret = Secret.fromSecretNameV2(this, 'ValheimLLMSecret', 'valheim-monitor-secrets');
    secret.grantRead(llmLambda);

    const gateway = new LambdaRestApi(this, 'ValheimLLMGateway', {
      handler: defaultErrorLambda,
      proxy: false,
      endpointTypes: [EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowHeaders: ['*'],
        allowCredentials: true
      },
      deployOptions: {
        throttlingBurstLimit: 3,
        throttlingRateLimit: 5
      }
    });

    const interactions = gateway.root.addResource('interactions');
    interactions.addMethod('POST', new LambdaIntegration(llmLambda));
  }
}
