import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class ValheimMonitorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'ValheimMonitorTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      encryption: TableEncryption.AWS_MANAGED,
      tableName: 'ValheimMonitorTable',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: false
    });

    const lambda = new NodejsFunction(this, 'ValheimMonitorLambda', {
      runtime: Runtime.NODEJS_24_X,
      handler: 'handler',
      depsLockFilePath: '../lambda/package-lock.json',
      entry: '../lambda/handler.js',
      environment: {
        TABLE_NAME: table.tableName
      },
      bundling: { minify: true },
      logGroup: new LogGroup(this, 'ValheimMonitorLogGroup', {
        retention: RetentionDays.THREE_DAYS
      }),
      reservedConcurrentExecutions: 1,
      timeout: cdk.Duration.seconds(30)
    });

    table.grantReadWriteData(lambda);

    const secret = Secret.fromSecretCompleteArn(this, 'ValheimMonitorSecret', 'arn:aws:secretsmanager:us-east-1:108929950724:secret:valheim-monitor-secrets-bp6Izr');
    secret.grantRead(lambda);

    const rule = new Rule(this, 'ValheimMonitorSchedule', {
      schedule: Schedule.cron({ minute: '*/5' })
    });

    rule.addTarget(new LambdaFunction(lambda));
  }
}
