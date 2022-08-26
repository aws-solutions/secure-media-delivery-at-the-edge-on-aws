/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import {
  Stack,
  RemovalPolicy,
  Aws,
  aws_dynamodb as ddb,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_sqs as sqs,
  aws_iam as iam,
  aws_lambda_event_sources as event_source,
  StackProps
} from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
import { IConfiguration } from "../helpers/validators/configuration";
import { AutoRevokeSessionsWorkflow } from "./autorevocation/auto_revocation_workflow";
import { CrLoadSqlParams } from "./custom_resources/cr_load_athena_config_table";
import { addCfnSuppressRules } from "./cfn_nag/cfn_nag_utils";

export interface AutoSessionRevocationStackProps extends StackProps {
  readonly description: string
}

export class AutoSessionRevocationStack extends Stack {

  constructor(
    scope: Construct,
    id: string,
    configuration: IConfiguration,
    sessionsTable: ITable,
    props: AutoSessionRevocationStackProps
  ) {
    super(scope, id, props);

    const sqlQueryBucket = new s3.Bucket(this, "SqlQuery", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true
       }),
    });

    addCfnSuppressRules(sqlQueryBucket, [{ id: 'W51', reason: 'The bucket is used to store results from Athena Query' }]);
    addCfnSuppressRules(sqlQueryBucket, [{ id: 'W35', reason: 'It is a log bucket, access logging is not necessary' }]);


    //DynamoDB table holding the configuration for Athena Query (that is populate on deploying the stack and that can be modified by a user at anytime)
    const sqlConfigTable = new ddb.Table(this, "SqlConfigTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "table_name", type: ddb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: ddb.StreamViewType.NEW_IMAGE,
      pointInTimeRecovery: true,
    });

    addCfnSuppressRules(sqlConfigTable, [{ id: 'W74', reason: 'DynamoDB table has encryption enabled owned by Amazon.' }]);


    const autoRevocationWorflow  = new AutoRevokeSessionsWorkflow(
      this,
      "GetSessions",
      {
        bucket: sqlQueryBucket,
        dynamodbTable: sessionsTable,
        configuration: configuration,
      }
    );

    //When DynamoDB table holding the configuration for Athena query is modified, the Lambda is triggered and updates the env params for SubmitQuery Lambda
    //the StepFunction when running the query against CloudFront logs
    const exportParams = new lambda.Function(this, "ExportParams", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: Aws.STACK_NAME + "_ExportParams",
      code: lambda.Code.fromAsset("lambda/export_params"),
      handler: "index.handler",
      environment: {
        SUBMIT_QUERY_FUNCTION : autoRevocationWorflow.submitQueryFunction.functionName,
        SOLUTION_IDENTIFIER: `AwsSolution/${configuration.solutionId}/${configuration.solutionVersion}`,
        METRICS: String(configuration.main.metrics)
      },
    });

    exportParams.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "lambda:UpdateFunctionConfiguration"
        ],
        resources: [autoRevocationWorflow.submitQueryFunction.functionArn],
      })
    );

    const crLoadSqlParams = new CrLoadSqlParams(this, "SqlConfig", {
      table: sqlConfigTable,
      configuration: configuration,
    });

    //wait to create the table and lambda
    crLoadSqlParams.node.addDependency(sqlConfigTable);
    crLoadSqlParams.node.addDependency(exportParams);

    addCfnSuppressRules(exportParams, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(exportParams, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(exportParams, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    sqlQueryBucket.grantReadWrite(exportParams);

    // Set Lambda Logs Retention and Removal Policy
    const readStreamLogs = new logs.LogGroup(this, "ReadStreamLogs", {
      logGroupName: "/aws/lambda/" + exportParams.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(readStreamLogs, [{ id: 'W84', reason: 'CloudWatch log group is always encrypted by default.' }]);


    const deadLetterQueue = new sqs.Queue(this, "deadLetterQueue", {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    addCfnSuppressRules(deadLetterQueue, [{ id: 'W92', reason: 'We are satisfied with default KMS encryption on SQS queue.' }]);


    exportParams.addEventSource(
      new event_source.DynamoEventSource(sqlConfigTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 5,
        bisectBatchOnError: true,
        onFailure: new event_source.SqsDlq(deadLetterQueue),
        retryAttempts: 10,
      })
    );




  }
}
