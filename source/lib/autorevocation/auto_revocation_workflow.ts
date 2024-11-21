// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Duration,
  CfnOutput,
  Aws,
  RemovalPolicy,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_dynamodb as ddb,
  aws_events as events,
  aws_events_targets as targets,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_logs as logs,
} from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";

import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

export interface IConfigProps {
  bucket: IBucket;
  dynamodbTable: ddb.ITable;
  configuration: IConfiguration;
}


export class AutoRevokeSessionsWorkflow extends Construct {

  public submitQueryFunction : IFunction;
  constructor(
    scope: Construct,
    id: string,
    props: IConfigProps
  ) {
    super(scope, id);

    const submitAthenaQuery = new lambda.Function(this, "SubmitQuery", {
      functionName: Aws.STACK_NAME + "_SubmitQuery",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/prepare_query"),
      handler: "index.handler",
      environment: {
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
      
    });

    this.submitQueryFunction = submitAthenaQuery;

    addCfnSuppressRules(submitAthenaQuery, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(submitAthenaQuery, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(submitAthenaQuery, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    const streamLogs = new logs.LogGroup(this, "SubmitQueryLogs", {
      logGroupName: "/aws/lambda/" + submitAthenaQuery.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(streamLogs, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);


    const saveSessionsToDdb = new lambda.Function(this, "SaveAutoSession", {
      functionName: Aws.STACK_NAME + "_SaveAutoSession",
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/save_auto_session"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: props.dynamodbTable.tableName,
        TTL: "7",
        SOLUTION_IDENTIFIER: `AwsSolution/${props.configuration.solutionId}/${props.configuration.solutionVersion}`,
        METRICS: String(props.configuration.main.metrics)
      },
    });
    addCfnSuppressRules(saveSessionsToDdb, [{ id: 'W58', reason: 'Lambda has CloudWatch permissions by using service role AWSLambdaBasicExecutionRole' }]);
    addCfnSuppressRules(saveSessionsToDdb, [{ id: 'W89', reason: 'We don t have any VPC in the stack, we only use serverless services' }]);
    addCfnSuppressRules(saveSessionsToDdb, [{ id: 'W92', reason: 'No need for ReservedConcurrentExecutions, some are used only for the demo website, and others are not used in a concurrent mode.' }]);


    props.dynamodbTable.grantReadWriteData(saveSessionsToDdb);

    const saveSessionsLogs = new logs.LogGroup(this, "SaveSessionsLogs", {
      logGroupName: "/aws/lambda/" + saveSessionsToDdb.functionName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(saveSessionsLogs, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);


    submitAthenaQuery.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["athena:StartQueryExecution"],
        resources: [
          "arn:aws:athena:*:*:workgroup/*",    
          "arn:aws:athena:*:*:datacatalog/*",
         ],
      })
    );

    const prepareQueryJob = new tasks.LambdaInvoke(
      this,
      "Prepare Athena Query",
      {
        lambdaFunction: submitAthenaQuery,
      }
    );

    const saveSessionsJob = new tasks.LambdaInvoke(this, "Save to DynamoDB", {
      lambdaFunction: saveSessionsToDdb,
      inputPath: sfn.JsonPath.stringAt("$.GetQueryResults.ResultSet.Rows"),
    });

    const startQueryExecutionJob = new tasks.AthenaStartQueryExecution(
      this,
      "Start Athena Query",
      {
        queryString: sfn.JsonPath.stringAt("$.Payload"),
        queryExecutionContext : {
          databaseName: props.configuration.sessionRevocation?.db_name
        },
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        resultConfiguration: {
          outputLocation: {
            bucketName: props.bucket.bucketName,
            objectKey: "results",
          },
        },
      }
    );

    const getQueryResultsJob = new tasks.AthenaGetQueryResults(
      this,
      "Get Query Results",
      {
        queryExecutionId: sfn.JsonPath.stringAt(
          "$.QueryExecution.QueryExecutionId"
        ),
        resultPath: sfn.JsonPath.stringAt("$.GetQueryResults"),
      }
    );

    const prepareNextParams = new sfn.Pass(this, "Prepare Next Query Params", {
      parameters: {
        "QueryExecutionId.$": "$.StartQueryParams.QueryExecutionId",
        "NextToken.$": "$.GetQueryResults.NextToken",
      },
      resultPath: sfn.JsonPath.stringAt("$.StartQueryParams"),
    });
    const done = new sfn.Succeed(this, "Done");

    const hasMoreResults = new sfn.Choice(this, "Has More Results?")
      .when(
        sfn.Condition.isPresent("$.GetQueryResults.NextToken"),
        prepareNextParams.next(getQueryResultsJob)
      )
      .otherwise(done);

    const hasResults = new sfn.Choice(this, "Has Results?")
      .when(
        sfn.Condition.isPresent("$.GetQueryResults.ResultSet.Rows[1]"),
        saveSessionsJob.next(hasMoreResults)
      )
      .otherwise(done);

    const logGroup = new logs.LogGroup(this, "AthenaQueryGroup",{
      logGroupName: "/aws/vendedlogs/states/" + Aws.STACK_NAME + "-AthenaQuery",
        removalPolicy: RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
    });
    addCfnSuppressRules(logGroup, [{ id: 'W84', reason: 'We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.' }]);


    // Step function to orchestrate Athena query to detect corrupted sessions and update DynamoDB Table with the results
    const workflow = new sfn.StateMachine(this, "AthenaQuery", {
      stateMachineName: Aws.STACK_NAME + "_DetectSessions",
      definition: prepareQueryJob
        .next(startQueryExecutionJob)
        .next(getQueryResultsJob)
        .next(hasResults),
      timeout: Duration.minutes(60),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    const triggerFrequency =
      props.configuration.sessionRevocation?.trigger_workflow_frequency || 0;
    if (triggerFrequency > 0) {
      // Trigger Sfn to rotate the secrets every X minutes
      const rule = new events.Rule(this, "RuleInvalidateSessions", {
        schedule: events.Schedule.rate(Duration.minutes(triggerFrequency)),
        description: "Trigger StepFunction to detect sessions to invalidate",
        enabled: true,
      });

      rule.addTarget(new targets.SfnStateMachine(workflow));
    }

    new CfnOutput(this, "SessionInvalidateName", { // NOSONAR
      value: workflow.stateMachineName,
      description: "State machine used to detect sessions to invalidate",
    });
  }
}
