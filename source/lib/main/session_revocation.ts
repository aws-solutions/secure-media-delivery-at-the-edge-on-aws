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
  Aws,
  RemovalPolicy,
  custom_resources,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_iam as iam,
  aws_sqs as sqs,
  aws_lambda_event_sources as event_source,
  CfnOutput,
} from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

export interface IConfigProps {
  sessionToRevoke: ITable;
  gsi_index_name: string;
  ruleNameParamName: string;
  ruleIdParamName: string;
  configuration: IConfiguration;
}

export class SessionRevocation extends Construct {
  public readonly sessionsTable: ddb.ITable;
  constructor(scope: Construct, id: string, config: IConfigProps) {
    super(scope, id);

    const accountId = Aws.ACCOUNT_ID;
    //Getting the RuleGroup ID create in us-east-1 region (in a different stack)
    const ssmRuleGroupParameterId = new custom_resources.AwsCustomResource(
      this,
      "SSMParameter",
      {
        onCreate: {
          service: "SSM",
          action: "getParameter",
          parameters: { Name: config.ruleIdParamName },
          region: Aws.REGION,
          physicalResourceId: custom_resources.PhysicalResourceId.of(
            `${config.ruleIdParamName}-${Aws.REGION}`
          ),
        },
        policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ssm:GetParameter*"],
            resources: [
              `arn:aws:ssm:${Aws.REGION}:${accountId}:parameter/*`,
            ],
          }),
        ]),
      }
    );



    const ssmRuleGroupId =
      ssmRuleGroupParameterId.getResponseField("Parameter.Value");

    //Revoke an active session
    //Update WAF RuleGroup with sessions from DynamoDB
    const updateRuleGroupFunction = new lambda.Function(
      this,
      "UpdateRuleGroup",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        functionName: Aws.STACK_NAME + "_UpdateRuleGroup",
        code: lambda.Code.fromAsset("lambda/update_rulegroup"),
        handler: "index.handler",
        environment: {
          RULE_ID: ssmRuleGroupId,
          RULE_NAME: config.ruleNameParamName,
          RETENTION: config.configuration.main.retention,
          TABLE_NAME: config.sessionToRevoke.tableName,
          MAX_SESSIONS: config.configuration.main.wcu,
          GSI_INDEX_NAME: config.gsi_index_name,
          SOLUTION_IDENTIFIER: `AwsSolution/${config.configuration.solutionId}/${config.configuration.solutionVersion}`,
          METRICS: String(config.configuration.main.metrics)
        },
      }
    );



    // Set Lambda Logs Retention and Removal Policy
    const myLogs = new logs.LogGroup(this, "ReadStreamLogs", {
      logGroupName: "/aws/lambda/" + updateRuleGroupFunction.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(myLogs, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);


    updateRuleGroupFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "wafv2:GetRuleGroup",
          "wafv2:UpdateRuleGroup",
          "wafv2:ListRuleGroups",
        ],
        resources: [
          `arn:aws:wafv2:us-east-1:${accountId}:global/rulegroup/${config.ruleNameParamName}/${ssmRuleGroupId}`,
        ],
      })
    );

    addCfnSuppressRules(updateRuleGroupFunction, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(updateRuleGroupFunction, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(updateRuleGroupFunction, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);

    const deadLetterQueue = new sqs.Queue(this, "updateRuleGroupDlq", {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    addCfnSuppressRules(deadLetterQueue, [{ id: 'W92', reason: 'We are satisfied with default KMS encryption on SQS queue.' }]);


    //trigger the Lambda every time when DynamoDB table is updated
    updateRuleGroupFunction.addEventSource(
      new event_source.DynamoEventSource(config.sessionToRevoke, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 5,
        bisectBatchOnError: true,
        onFailure: new event_source.SqsDlq(deadLetterQueue),
        retryAttempts: 10,
      })
    );

    config.sessionToRevoke.grantReadData(updateRuleGroupFunction);
    addCfnSuppressRules(deadLetterQueue, [{ id: 'W12', reason: '* policy is generated by grantReadData method above' }]);


    new CfnOutput(this, "WafRuleGroupName", {
      description: "WAF RuleGroup Name",
      value: config.ruleNameParamName
    });

    new CfnOutput(this, "WafRuleGroupId", {
      description: "WAF RuleGroup Id",
      value: ssmRuleGroupId
    });

    new CfnOutput(this, "WafRuleGroupArn", {
      description: "WAF RuleGroup Name Arn",
      value : `arn:aws:wafv2:us-east-1:${Aws.ACCOUNT_ID}:global/rulegroup/${config.ruleNameParamName}/${config.ruleNameParamName}`
    });


  }
}
