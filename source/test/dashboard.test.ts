import { Template } from 'aws-cdk-lib/assertions';
import {
  aws_lambda as lambda, Stack
} from "aws-cdk-lib";
import { CWDashboard } from '../lib/main/dashboard';
import { Aws } from 'aws-cdk-lib';


test('Create CW dashboard with widgets', () => {
  const stack = new Stack();
  // WHEN
  const myDashboard = new CWDashboard(stack, 'Dashboard')
  

  const generateToken = new lambda.Function(stack, "GenerateToken", {
    functionName: Aws.STACK_NAME + "_GenerateToken",
    runtime: lambda.Runtime.NODEJS_16_X,
    code: lambda.Code.fromAsset("lambda/generate_token/nodejs"),
    handler: "index.handler",

  });

  myDashboard.buildApiDashboard({
    lambdaFunctionName: generateToken.functionName,
    region: Aws.REGION,
  });

  myDashboard.buildApiDashboard({
    lambdaFunctionName: generateToken.functionName,
    region: Aws.REGION,
  });

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::CloudWatch::Dashboard", 1);
});
