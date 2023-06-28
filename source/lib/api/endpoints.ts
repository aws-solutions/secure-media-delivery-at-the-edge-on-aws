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
  CfnOutput,
  RemovalPolicy,
  aws_lambda as lambda,
  aws_s3_deployment as s3deploy,
  aws_cloudfront as cloudfront,
  aws_s3 as s3,
  aws_cloudfront_origins as origins,
  aws_logs as logs,
  Duration,
  custom_resources,
  aws_iam as iam

} from "aws-cdk-lib";

import { Construct } from "constructs";

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpIamAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CfnStage } from "aws-cdk-lib/aws-apigatewayv2";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

export interface IConfigProps {
  generateTokenLambdaFunction: IFunction;
  saveSessionToDDBLambdaFunction: IFunction;
  updateTokenLambdaFunction: IFunction;
  sig4LambdaVersionParamName: string;
  sig4LambdaRoleArn: string;
  demo: boolean;
}

export class Endpoints extends Construct {
  private API_GATEWAY_LOG_FORMAT: string =
    '{"requestId":"$context.requestId","ip": "$context.identity.sourceIp","requestTime":"$context.requestTime","requestTimeEpoch":"$context.requestTimeEpoch","httpMethod":"$context.httpMethod","routeKey":"$context.routeKey","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","integration error":"$context.integrationErrorMessage"}';

  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    const s3Logs = new s3.Bucket(this, "LogsBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
      versioned: true,
      enforceSSL: true,
    });

    addCfnSuppressRules(s3Logs, [
      {
        id: "W35",
        reason: "It is a log bucket, not need to have access logging enabled.",
      },
    ]);
    addCfnSuppressRules(s3Logs, [
      {
        id: "W51",
        reason: "It is a log bucket, not need for a bucket policy.",
      },
    ]);

    const hostingBucket = new s3.Bucket(this, "HostingBucket", {
      serverAccessLogsBucket: s3Logs,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true
       }),
       versioned: true,
       enforceSSL: true,
    });

    addCfnSuppressRules(hostingBucket, [
      {
        id: "W35",
        reason: "It is a log bucket, not need to have access logging enabled.",
      },
    ]);

    addCfnSuppressRules(hostingBucket, [
      { id: "W41", reason: "Encryption done" },
    ]);

    const folder = props.demo ? "demo_website" : "empty_demo_website";
    new s3deploy.BucketDeployment(this, "DeployWebsite", { // NOSONAR
      sources: [s3deploy.Source.asset("resources/" + folder)],
      destinationBucket: hostingBucket,
    });

    const authorizer = new HttpIamAuthorizer();

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: Aws.STACK_NAME + "_SecureMediaStreamDemoAPI",
      description: "Secure Media Stream Demo API",
      defaultAuthorizer: authorizer,
    });

    const log = new LogGroup(this, "HttpApiLogGroup", {
      logGroupName: "/aws/apigw/" + httpApi.httpApiName,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    addCfnSuppressRules(log, [
      {
        id: "W84",
        reason:
          "We are satisfied with default KMS encryption on CloudWatchLogs LogGroup.",
      },
    ]);

    const stage = <CfnStage>httpApi.defaultStage!.node.defaultChild;
    stage.accessLogSettings = {
      destinationArn: log.logGroupArn,
      format: this.API_GATEWAY_LOG_FORMAT,
    };

    httpApi.addRoutes({
      path: "/tokengenerate",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "GenerateTokenIntegration",
        props.generateTokenLambdaFunction
      ),
    });

    httpApi.addRoutes({
      path: "/sessionrevoke",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "RevokeSessionIntegration",
        props.saveSessionToDDBLambdaFunction
      ),
    });

    httpApi.addRoutes({
      path: "/updatetoken",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "UpdateTokenIntegration",
        props.updateTokenLambdaFunction
      ),
    });

    const region = Aws.REGION;

    const myOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "OriginRequestPolicy",
      {
        originRequestPolicyName: Aws.STACK_NAME + "CMS",
        comment: "A default policy",
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          "CloudFront-Viewer-Address",
          "CloudFront-Viewer-Country",
          "CloudFront-Viewer-Country-Region",
          "Referer",
          "User-Agent"
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      }
    );

    const myResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      {
        responseHeadersPolicyName: Aws.STACK_NAME + "SecureStreamingPolicy",
        comment: "ResponseHeadersPolicy for Secure Media Streaming",
        securityHeadersBehavior: {
          //contentSecurityPolicy: { contentSecurityPolicy: "default-src 'none'; script-src 'self' https://unpkg.com https://code.jquery.com https://cdn.jsdelivr.net; style-src 'self' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self'; connect-src *; media-src blob:; worker-src blob:", override: true },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: { protection: true, modeBlock: true, override: true },
        },
      }
    );

    const ssmSig4VersionArn = new custom_resources.AwsCustomResource(
      this,
      "SSMParameterVersion",
      {
        onUpdate: {
          service: "SSM",
          action: "getParameter",
          parameters: { Name: `${props.sig4LambdaVersionParamName}` },
          region: Aws.REGION,
          physicalResourceId: custom_resources.PhysicalResourceId.of(`${props.sig4LambdaVersionParamName}`)
        },
        policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ssm:GetParameter*"],
            resources: [
              `arn:aws:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/*`,
            ],
          }),
        ]),
      }
    );

    const lambdaEdgeVersionArn =
      ssmSig4VersionArn.getResponseField("Parameter.Value");

    const httpApiOrigin = new origins.HttpOrigin(
      `${httpApi.apiId}.execute-api.${region}.amazonaws.com`
    );

    const lambdaEdge = lambda.Version.fromVersionArn(
      this,
      "CfLambdaEdge",
      lambdaEdgeVersionArn
    );

    const s3origin = new origins.S3Origin(hostingBucket);

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: Aws.STACK_NAME + " - Demo website Secure Media Delivery at the Edge on AWS",
      defaultRootObject: "index.html",
      enableLogging: true,
      logBucket: s3Logs,
      logFilePrefix: "distribution-access-logs/",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2016,
      defaultBehavior: {
        origin: s3origin,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/index.html": {
          origin: s3origin,
          responseHeadersPolicy: myResponseHeadersPolicy,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        },
        "/tokengenerate": {
          origin: httpApiOrigin,
          edgeLambdas: [
            {
              functionVersion: lambdaEdge,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: myOriginRequestPolicy,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy
              .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
        "/sessionrevoke": {
          origin: httpApiOrigin,
          edgeLambdas: [
            {
              functionVersion: lambdaEdge,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: myOriginRequestPolicy,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy
              .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        }, 
        "/updatetoken": {
          origin: httpApiOrigin,
          edgeLambdas: [
            {
              functionVersion: lambdaEdge,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: myOriginRequestPolicy,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy
              .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
    });

    addCfnSuppressRules(distribution, [
      {
        id: "W70",
        reason: "CloudFront has the setting to use minimum TLS version 1.2.",
      },
    ]);

    new CfnOutput(this, "HostingBucketName", { // NOSONAR
      value: hostingBucket.bucketName,
      description: "Hosting bucket name",
    });

    new CfnOutput(this, "ApiEndpoint", { // NOSONAR
      value: `${httpApi.apiId}.execute-api.${region}.amazonaws.com`,
      description: "Endpoint",
    });

    new CfnOutput(this, "DistributionDomainName", { // NOSONAR
      value: "https://" + distribution.domainName,
      description: "Demo Website",
    });
  }
}
