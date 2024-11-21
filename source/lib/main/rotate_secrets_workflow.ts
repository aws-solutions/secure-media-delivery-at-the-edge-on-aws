// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Aws,
  CfnOutput,
  Duration,
  RemovalPolicy,
  aws_lambda as lambda,
  aws_cloudfront as cloudfront,
  aws_logs as logs,
  aws_iam as iam,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_events as events,
  aws_events_targets as targets,
} from "aws-cdk-lib";
import { JsonPath } from "aws-cdk-lib/aws-stepfunctions";

import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";
import { CrInitSecrets } from "../custom_resources/cr_init_secrets";
import { Secrets } from "./secrets";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

/**
 * The properties expected by the config construct.
 */
export interface IConfigProps {
  secrets: Secrets;
  checkTokenFunction: cloudfront.IFunction;
  configuration: IConfiguration;
}

export class RotateSecretsWorkflow extends Construct {
  public readonly workflowArn: string;

  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    //Lambda used to generate new secrets:
    // 1 - generate 2 secrets when deploying the stacck
    // 2 - generate a new secret at each execution
    const generateSecretUpdateCff = new lambda.Function(
      this,
      "GenerateSecretUpdateCff",
      {
        functionName: Aws.STACK_NAME + "_GenerateSecretUpdateCff",
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("lambda/generate_secret_update_cff"),
        timeout: Duration.seconds(300),
        handler: "index.handler",
        environment: {
          TEMPORARY_KEY_NAME: props.secrets.temporarySecret.secretName,
          PRIMARY_KEY_NAME: props.secrets.primarySecret.secretName,
          SECONDARY_KEY_NAME: props.secrets.secondarySecret.secretName,
          CFF_NAME: props.checkTokenFunction.functionName,
          SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
          METRICS: String(props.configuration.main.metrics)

        },
      }
    );

    addCfnSuppressRules(generateSecretUpdateCff, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(generateSecretUpdateCff, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(generateSecretUpdateCff, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);

    generateSecretUpdateCff.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:DescribeFunction",
          "cloudfront:UpdateFunction",
          "cloudfront:PublishFunction",
        ],
        resources: [props.checkTokenFunction.functionArn],
      })
    );

    // Set Lambda Logs Retention and Removal Policy
    const myLogs = new logs.LogGroup(this, "GenerateNewSecretLogs", {
      logGroupName: "/aws/lambda/" + generateSecretUpdateCff.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(myLogs, [{ id: 'W84', reason: 'CloudWatch log group is always encrypted by default.' }]);


    new CrInitSecrets(this, "Init", { // NOSONAR
      functionArn: generateSecretUpdateCff.functionArn,
      functionName: generateSecretUpdateCff.functionName,
    });

    //Swap secrets:
    // - the new secret is store in secret1
    // - the old secret1 is stored in secret2
    const swapSecrets = new lambda.Function(this, "SwapSecrets", {
      functionName: Aws.STACK_NAME + "_SwapSecrets",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/swap_secrets"),
      handler: "index.handler",
      environment: {
        TEMPORARY_KEY_NAME: props.secrets.temporarySecret.secretName,
        PRIMARY_KEY_NAME: props.secrets.primarySecret.secretName,
        SECONDARY_KEY_NAME: props.secrets.secondarySecret.secretName,
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
    });

    addCfnSuppressRules(swapSecrets, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(swapSecrets, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(swapSecrets, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    // Set Lambda Logs Retention and Removal Policy
    const keyRotationLogs = new logs.LogGroup(this, "KeyRotationLogs", {
      logGroupName: "/aws/lambda/" + swapSecrets.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(keyRotationLogs, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);


    props.secrets.temporarySecret.grantWrite(generateSecretUpdateCff);
    props.secrets.primarySecret.grantWrite(generateSecretUpdateCff);
    props.secrets.secondarySecret.grantWrite(generateSecretUpdateCff);
    props.secrets.primarySecret.grantRead(generateSecretUpdateCff);

    //swapSecrets
    props.secrets.temporarySecret.grantRead(swapSecrets);
    props.secrets.temporarySecret.grantWrite(swapSecrets);

    props.secrets.primarySecret.grantWrite(swapSecrets);
    props.secrets.primarySecret.grantRead(swapSecrets);

    props.secrets.secondarySecret.grantWrite(swapSecrets);
    props.secrets.secondarySecret.grantRead(swapSecrets);


    const updateCloudFrontFunctionJob = new tasks.LambdaInvoke(
      this,
      "Generate new secret & update CloudFront Function",
      {
        lambdaFunction: generateSecretUpdateCff,
        resultPath: JsonPath.DISCARD,
        resultSelector: {
          "Output.$": "$.Payload",
        },
      }
    );

    const getCFFStatus = new tasks.CallAwsService(this, 'Get CloudFront Function Status', {
      service: 'cloudfront',
      action: 'describeFunction',
      parameters: {
        Name: props.checkTokenFunction.functionName,
        Stage: 'LIVE'
      },
      iamResources: [`arn:aws:cloudfront::${Aws.ACCOUNT_ID}:function/${props.checkTokenFunction.functionName}`],
      iamAction: 'cloudfront:describeFunction',
    });

    const swapSecretsJob = new tasks.LambdaInvoke(this, "Swap secrets", {
      lambdaFunction: swapSecrets,
    });

    const wait = new sfn.Wait(this, "Wait 20 seconds", {
      time: sfn.WaitTime.duration(Duration.seconds(20)),
    });


    const updatePropagated = new sfn.Choice(this, "Status = DEPLOYED ?")
    .when(sfn.Condition.stringEquals('$.FunctionSummary.Status', 'IN_PROGRESS'), wait.next(getCFFStatus))
    .otherwise(swapSecretsJob)


    const logGroup = new logs.LogGroup(this, "RotateSecretsGroup", {
      logGroupName: "/aws/vendedlogs/states/" + Aws.STACK_NAME + "-RotateSecrets",
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });
    addCfnSuppressRules(logGroup, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);

    //StepFunction used to coordinate tasks to swap secrets:
    // 1 - generate new secrets
    // 3 - update the CloudFront Function with the new secret
    // 4 - wait until CloudFront Function passes from IN_PROGRESS to DEPLOYED
    // 5 - Move secret 1 -> secret 2, new secret -> secret 1
    const workflow = new sfn.StateMachine(this, "Rotate", {
      stateMachineName: Aws.STACK_NAME + "_RotateSecret",
      definition:
        updateCloudFrontFunctionJob
        .next(getCFFStatus)
        .next(updatePropagated),
      timeout: Duration.minutes(60),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    const schedule_expression =
      props.configuration.main?.rotate_secrets_pattern;
    const schedule_frequency =
      props.configuration.main?.rotate_secrets_frequency;
    if (schedule_frequency !== "m") {
      // Trigger Sfn to rotate the secrets every X minutes
      const rule = new events.Rule(this, "Rule1", {
        schedule: events.Schedule.expression(
          "cron(" + schedule_expression + ")"
        ),
        description: "Trigger StepFunction to rotate secrets",
        enabled: true,
      });

      rule.addTarget(new targets.SfnStateMachine(workflow));
    }

    this.workflowArn = workflow.stateMachineArn;

    new CfnOutput(this, "SFRotateSecrets", { // NOSONAR
      value: workflow.stateMachineName,
      description: "The name of the Step Function to rotate secrets",
    });
  }
}
