// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Aws,
  RemovalPolicy,
  aws_lambda as lambda,
  aws_dynamodb as ddb,
  aws_logs as logs,
  CfnOutput,
} from "aws-cdk-lib";

import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";
import { Secrets } from "../main/secrets";
import { CrLoadAssetsTable } from "../custom_resources/cr_load_assets_table";
import { CWDashboard } from "../main/dashboard";
import { Endpoints } from "./endpoints";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

export interface IConfigProps {
  configuration: IConfiguration;
  secrets: Secrets;
  dashboard: CWDashboard;
  sessionsTable: ddb.ITable;
  sig4LambdaVersionParamName: string;
  sig4LambdaRoleArn: string
}

export class Api extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    //build a layer with required libs
    const cloudfrontTokenLayer = new lambda.LayerVersion(
      this,
      "GenerateTokenLayer",
      {
        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
        code: lambda.Code.fromAsset(
          "lambda/layers/aws_secure_media_delivery_nodejs"
        ),
        description: "Layer used by generate new secret lambda",
      }
    );

    //DDB table used to store configuration for demo website
    const demoAssetsTable = new ddb.Table(this, "DemoTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: ddb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    addCfnSuppressRules(demoAssetsTable, [{ id: 'W74', reason: 'DynamoDB table has encryption enabled owned by Amazon.' }]);

    if(props.configuration.hls || props.configuration.dash){
      //load the DDB table with 2 items (one for HLS and one for DASH)
      new CrLoadAssetsTable(this, "AssetsTable", { // NOSONAR
        table: demoAssetsTable,
        configuration: props.configuration,
      });
    }
    
    //Lambda that will generate the token using the provided SDK
    const generateToken = new lambda.Function(this, "GenerateToken", {
      functionName: Aws.STACK_NAME + "_GenerateToken",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/generate_token/nodejs"),
      handler: "index.handler",
      environment: {
        STACK_NAME: Aws.STACK_NAME,
        TABLE_NAME: demoAssetsTable.tableName,
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
      layers: [cloudfrontTokenLayer],
    });

    addCfnSuppressRules(generateToken, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(generateToken, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(generateToken, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    const generateTokenLogs = new logs.LogGroup(this, "GenerateTokenLogs", {
      logGroupName: "/aws/lambda/" + generateToken.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(generateTokenLogs, [{ id: 'W84', reason: 'CloudWatch log group is always encrypted by default.' }]);

    //Lambda to update parameters for the token
    const updateToken = new lambda.Function(this, "UpdateToken", {
      functionName: Aws.STACK_NAME + "_UpdateToken",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/update_token"),
      handler: "index.handler",
      environment: {
        STACK_NAME: Aws.STACK_NAME,
        TABLE_NAME: demoAssetsTable.tableName,
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
      layers: [cloudfrontTokenLayer],
    });

    const updateTokenLogs = new logs.LogGroup(this, "UpdateTokenLogs", {
      logGroupName: "/aws/lambda/" + updateToken.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(updateTokenLogs, [{ id: 'W84', reason: 'CloudWatch log group is always encrypted by default.' }]);



    addCfnSuppressRules(updateToken, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(updateToken, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(updateToken, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);

    demoAssetsTable.grantReadWriteData(updateToken);

        

    //Lambda used to add manually a session to be revoked into a DynamoDB Table
    const saveManualSession = new lambda.Function(this, "SaveManualSession", {
      functionName: Aws.STACK_NAME + "_SaveManualSession",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/save_manual_session/nodejs"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: props.sessionsTable.tableName,
        TTL: "7",
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
      layers: [cloudfrontTokenLayer],
    });

    addCfnSuppressRules(saveManualSession, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(saveManualSession, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(saveManualSession, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    const saveManualSessionLogs = new logs.LogGroup(this, "saveManualSessionLogs", {
      logGroupName: "/aws/lambda/" + saveManualSession.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(saveManualSessionLogs, [{ id: 'W84', reason: 'CloudWatch log group is always encrypted by default.' }]);



    demoAssetsTable.grantReadData(generateToken);
    props.sessionsTable.grantReadWriteData(saveManualSession);

    props.secrets.primarySecret.grantRead(generateToken);
    props.secrets.secondarySecret.grantRead(generateToken);
    //endpoint creation using a CloudFront Distribution in front of an HTTP API
    new Endpoints(this, "Endpoints", { // NOSONAR
      generateTokenLambdaFunction: generateToken,
      saveSessionToDDBLambdaFunction: saveManualSession,
      updateTokenLambdaFunction: updateToken,
      sig4LambdaVersionParamName: props.sig4LambdaVersionParamName,
      sig4LambdaRoleArn: props.sig4LambdaRoleArn,
      demo: props.configuration.api?.demo as boolean
    });

    //build a CloudWatch Dashboard to display some metrics from generateToken Lambda
    props.dashboard.buildApiDashboard({
      lambdaFunctionName: generateToken.functionName,
      region: Aws.REGION,
    });

    new CfnOutput(this, "VideoAssetTable", { // NOSONAR
      description: "Video asset table name",
      value: demoAssetsTable.tableName
    });
  }
}
