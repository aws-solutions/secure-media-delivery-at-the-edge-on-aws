// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Duration, Aws, aws_cloudwatch as cloudwatch } from "aws-cdk-lib";
import { Dashboard } from "aws-cdk-lib/aws-cloudwatch";

import { Construct } from "constructs";

/**
 * The properties expected by the config construct.
 */
export interface ICoreConfigProps {
  cfFunctionName: string;
  rotateSecretsWorkflowArn: string;
}

export interface IApiConfigProps {
  lambdaFunctionName: string;
  region: string;
}

export class CWDashboard extends Construct {
  public readonly dashboard: Dashboard;
  private readonly EXECUTION_SUCCEEDED = "ExecutionsSucceeded";
  private readonly EXECUTION_SUCCEEDED_LABEL = "Success";
  private readonly EXECUTION_FAILED = "ExecutionsFailed";
  private readonly EXECUTION_FAILED_LABEL = "Failure";

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dashboard = new cloudwatch.Dashboard(this, "MonitoringDashboard", {
      dashboardName: Aws.STACK_NAME + "-Secure-Media-Stream-Delivery",
    });
  }

  buildCoreDashboard(props: ICoreConfigProps) {
    const checkTokenWidget = new cloudwatch.LogQueryWidget({
      logGroupNames: ["/aws/cloudfront/function/" + props.cfFunctionName],
      view: cloudwatch.LogQueryVisualizationType.PIE,
      title: "Verify JWT token",
      width: 9,
      height: 6,
      region : "us-east-1",
      queryLines: [
        "fields @timestamp, @message",
        "filter @message like /X_JWT_CHECK/",
        'parse "* * *" as a,b,result',
        "stats count(*) as RESULT by result as total",
      ],
    });

    const cffComputeUsageMetric = new cloudwatch.Metric({
      namespace: "AWS/CloudFront",
      metricName: "FunctionComputeUtilization",
      period: Duration.minutes(5),
      dimensionsMap: { FunctionName: props.cfFunctionName, Region: "Global" },
      label: "Compute usage",
      statistic: "avg",
      region: "us-east-1"
    });

    const cffExecutionErrorsMetric = new cloudwatch.Metric({
      namespace: "AWS/CloudFront",
      metricName: "FunctionExecutionErrors",
      period: Duration.minutes(5),
      dimensionsMap: { FunctionName: props.cfFunctionName, Region: "Global" },
      label: "Function Execution Errors",
      statistic: "sum",
      region: "us-east-1"
    });

    const cffThrottlesMetric = new cloudwatch.Metric({
      namespace: "AWS/CloudFront",
      metricName: "FunctionThrottles",
      period: Duration.minutes(5),
      dimensionsMap: { FunctionName: props.cfFunctionName, Region: "Global" },
      label: "Function Throttles",
      statistic: "sum",
      region: "us-east-1"
    });

    const cffInvocationsMetric = new cloudwatch.Metric({
      namespace: "AWS/CloudFront",
      metricName: "FunctionInvocations",
      period: Duration.minutes(5),
      region : "us-east-1",
      dimensionsMap: { FunctionName: props.cfFunctionName, Region: "Global" },
      label: "Invocations",
      statistic: "sum",
    });

    const computeUsageWidget = new cloudwatch.GraphWidget({
      title: "Check JWT Token - Compute Utilization (Avg)",
      height: 6,
      width: 24,
      setPeriodToTimeRange: true,
      left: [cffComputeUsageMetric],
    });

    const functionExecutionErrorsWidget = new cloudwatch.GraphWidget({
      title: "Check JWT Token - Function Execution Errors (Sum)",
      height: 6,
      width: 24,
      setPeriodToTimeRange: true,
      left: [cffExecutionErrorsMetric],
    });

    const functionThrottlesWidget = new cloudwatch.GraphWidget({
      title: "Check JWT Token - Function Throttles (Sum)",
      height: 6,
      width: 24,
      setPeriodToTimeRange: true,
      left: [cffThrottlesMetric],
    });

    const rotateSecretsWidget = new cloudwatch.GraphWidget({
      title: "Rotate Secrets",
      view: cloudwatch.GraphWidgetView.PIE,
      width: 9,
      height: 6,
      setPeriodToTimeRange: true,
      left: [
        this.sumSfnMetricFails(props.rotateSecretsWorkflowArn),
        this.sumSfnMetricSucceeded(props.rotateSecretsWorkflowArn),
      ],
    });

    const invocationsWidget = new cloudwatch.GraphWidget({
      title: "Check JWT Token - Invocations (Sum)",
      height: 6,
      width: 24,
      stacked: true,
      setPeriodToTimeRange: true,
      left: [cffInvocationsMetric],
    });

    const invocationsNbWidget = new cloudwatch.SingleValueWidget({
      title: "Tokens checked",
      height: 6,
      width: 6,
      setPeriodToTimeRange: true,
      metrics: [cffInvocationsMetric],
    });

    this.dashboard.addWidgets(
      checkTokenWidget,
      rotateSecretsWidget,
      invocationsNbWidget,
      computeUsageWidget,
      functionExecutionErrorsWidget,
      functionThrottlesWidget,
      invocationsWidget
    );
  }

  buildApiDashboard(props: IApiConfigProps) {
    const tokensGeneratedMetric = new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      period: Duration.minutes(5),
      dimensionsMap: { FunctionName: props.lambdaFunctionName },
    });

    const invocationsNbWidget = new cloudwatch.SingleValueWidget({
      title: "Nb of tokens generated",
      height: 6,
      width: 6,
      setPeriodToTimeRange: true,
      metrics: [tokensGeneratedMetric],
    });

    const invocationsWidget = new cloudwatch.GraphWidget({
      title: "Tokens generated",
      height: 6,
      width: 18,
      region: props.region,
      setPeriodToTimeRange: true,
      left: [tokensGeneratedMetric],
    });

    this.dashboard.addWidgets(invocationsNbWidget, invocationsWidget);
  }

  sumSfnMetricSucceeded(resourceArn: string) {
    return this.sumSfnMetric(
      resourceArn,
      this.EXECUTION_SUCCEEDED,
      this.EXECUTION_SUCCEEDED_LABEL
    );
  }

  sumSfnMetricFails(resourceArn: string) {
    return this.sumSfnMetric(
      resourceArn,
      this.EXECUTION_FAILED,
      this.EXECUTION_FAILED_LABEL
    );
  }

  sumSfnMetric(resourceArn: string, metricName: string, label: string) {
    return new cloudwatch.Metric({
      namespace: "AWS/States",
      metricName: metricName,
      period: Duration.minutes(5),
      dimensionsMap: { StateMachineArn: resourceArn },
      label: label,
      statistic: "sum",
    });
  }
}
