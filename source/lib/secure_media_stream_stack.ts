// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Stack,
  StackProps,
  Aws,
  RemovalPolicy,
  Duration,
  CfnOutput,
  aws_iam as iam,
  aws_cloudfront as cloudfront,
  aws_dynamodb as ddb,
} from "aws-cdk-lib";


import { Construct } from "constructs";
import { IConfiguration } from "../helpers/validators/configuration";
import { Api } from "./api/api";
import { CRCreateLEWafRule } from "./custom_resources/cr_create_le_rule";
import { CWDashboard } from "./main/dashboard";
import { GetInputParameters } from "./cfn/check_input_parameters";
import { RotateSecretsWorkflow } from "./main/rotate_secrets_workflow";
import { Secrets } from "./main/secrets";
import { SessionRevocation } from "./main/session_revocation";
import { addCfnSuppressRules } from "./cfn_nag/cfn_nag_utils";
import { applyAppRegistry } from './application_registry/application_registry';

export interface SecureMediaStreamStackProps extends StackProps {
  readonly description: string
}

export class SecureMediaStreamingStack extends Stack {
  public readonly sessionToRevoke: ddb.ITable;
  private readonly GSI_NAME = "last_updated_index";

  private readonly LAMBDA_EDGE_VERSION_SSM_PARAM = Aws.STACK_NAME + "_sig4lambdaVersion";
  private readonly WAF_RULE_NAME_SSM_PARAM = Aws.STACK_NAME + "_BlockSessions";
  private readonly WAF_RULE_ID_SSM_PARAM = this.WAF_RULE_NAME_SSM_PARAM + '_ID';

  constructor(
    scope: Construct,
    id: string,
    appConfig: IConfiguration,
    props: SecureMediaStreamStackProps
  ) {
    super(scope, id, props);

    const parameters = new GetInputParameters(this, "InputParameters", appConfig);



    const crCreateLEWafRule = new CRCreateLEWafRule(this, "CRLEWAFRuleGroup", {
      WCU: parameters.customInputParameters.main.wcu,
      LAMBDA_EDGE_VERSION_SSM_PARAM: this.LAMBDA_EDGE_VERSION_SSM_PARAM,
      WAF_RULE_NAME_SSM_PARAM: this.WAF_RULE_NAME_SSM_PARAM,
      WAF_RULE_ID_SSM_PARAM: this.WAF_RULE_ID_SSM_PARAM,
      DEPLOY_LE: parameters.customInputParameters.api ? true: false,
      METRICS: parameters.customInputParameters.main.metrics,
      SOLUTION_IDENTIFIER: `AwsSolution/${parameters.customInputParameters.solutionId}/${parameters.customInputParameters.solutionVersion}`,
    })

    /*
    ############## IT IS RECOMMENDED TO ACTIVATE CLOUDTRAIL #################
    #########################################################################

    const s3Logs = new s3.Bucket(this, "CloudTrailLogsBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true
        }),
    });
    addCfnSuppressRules(s3Logs, [{ id: 'W35', reason: 'Log bucket, no access log required' }]);
    addCfnSuppressRules(s3Logs, [{ id: 'W41', reason: 'By default, the log files delivered by CloudTrail to your bucket are encrypted by Amazon server-side encryption with Amazon S3-managed encryption keys (SSE-S3)' }]);


    new cloudtrail.Trail(this, 'CloudTrail', {
      bucket: s3Logs
    });
    */



    //CloudFront Function used to check the JWT token for each request
    const checkToken = new cloudfront.Function(this, "CheckJWTTokenFunction", {
      code: cloudfront.FunctionCode.fromFile({
        filePath: "lambda/generate_secret_update_cff/cff.js",
      }),
      functionName: Aws.STACK_NAME + "_checkJWTToken",
      comment:
        "CloudFront Function Token validator",
    });

    const secrets = new Secrets(this, "Secrets");

    //DynamoDB Table used to hold sessions to be revoked (manually added or automatically via the Step Function)
    const sessionToRevoke = new ddb.Table(this, "SessionToRevoke", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "session_id", type: ddb.AttributeType.STRING },
      stream: ddb.StreamViewType.KEYS_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      timeToLiveAttribute: "ttl"
    });

    addCfnSuppressRules(sessionToRevoke, [{ id: 'W74', reason: 'DynamoDB table has encryption enabled owned by Amazon.' }]);


    const customPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [
            secrets.primarySecret.secretArn,
            secrets.secondarySecret.secretArn,
          ],
          actions: [
            "secretsmanager:GetResourcePolicy",
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:ListSecretVersionIds",
          ],
        }),
        new iam.PolicyStatement({
          resources: [sessionToRevoke.tableArn],
          actions: ["dynamodb:PutItem", "dynamodb:BatchWrite*"],
        }),
      ],
    });

    //role created to be assumed by the SDK
    const role4sdk = new iam.Role(this, "Role4SDK", {
      description: "A role to be assumed by the SDK",
      assumedBy: new iam.AccountPrincipal(Aws.ACCOUNT_ID),
      inlinePolicies: {
        policy: customPolicy,
      },
      maxSessionDuration: Duration.hours(12),
    });

    //add global secondary index
    sessionToRevoke.addGlobalSecondaryIndex({
      indexName: this.GSI_NAME,
      partitionKey: { name: "reason", type: ddb.AttributeType.STRING },
      sortKey: { name: "last_updated", type: ddb.AttributeType.NUMBER },
      projectionType: ddb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["score", "type"],
    });

    this.sessionToRevoke = sessionToRevoke;

    //session revocation resources
    const sessionRevocation = new SessionRevocation(this, "SessionRevocation", {
      sessionToRevoke: sessionToRevoke,
      gsi_index_name: this.GSI_NAME,
      ruleNameParamName: this.WAF_RULE_NAME_SSM_PARAM,
      ruleIdParamName: this.WAF_RULE_ID_SSM_PARAM,
      configuration: parameters.customInputParameters
    });

    sessionRevocation.node.addDependency(crCreateLEWafRule);


    //workflow used to rotate secrets (on a frequency selected by the user in the wizard)
    const rotateSecretsWorkflow = new RotateSecretsWorkflow(
      this,
      "RotateSecrets",
      {
        secrets: secrets,
        checkTokenFunction: checkToken,
        configuration: parameters.customInputParameters,
      }
    );

    //create a CloudWatch Dashboard where widgets will be added by eash selected module (API and Session Revocation)
    const dashboard = new CWDashboard(this, "CoreDashboard");
    dashboard.buildCoreDashboard({
      cfFunctionName: checkToken.functionName,
      rotateSecretsWorkflowArn: rotateSecretsWorkflow.workflowArn,
    });

    if (parameters.customInputParameters.api) {
      //if the API module was selected in the wizard, deploy the required resources
      new Api(this, "Api", { // NOSONAR
        configuration: parameters.customInputParameters,
        secrets: secrets,
        dashboard: dashboard,
        sessionsTable: sessionToRevoke,
        sig4LambdaVersionParamName: this.LAMBDA_EDGE_VERSION_SSM_PARAM,
        sig4LambdaRoleArn: crCreateLEWafRule.roleToPass.roleArn        
      });
    }

    // Service Catalog Application Registry
    applyAppRegistry(this, appConfig);

    new CfnOutput(this, "RoleArn", { // NOSONAR
      description: "The ARN of the role to be assumed by SDK",
      value: role4sdk.roleArn,
    });

    new CfnOutput(this, "CheckTokenFunction", { // NOSONAR
      description: "CloudFront Function Token validator",
      value: checkToken.functionName
    });

    new CfnOutput(this, "SessionRevocationTable", { // NOSONAR
      description: "Table that holds the sessions to be revoked",
      value: sessionToRevoke.tableName
    });
  }
}
