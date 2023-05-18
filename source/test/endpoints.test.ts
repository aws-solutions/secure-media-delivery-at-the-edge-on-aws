import { Template } from 'aws-cdk-lib/assertions';
import { 
  aws_lambda as lambda,
  Stack
} from "aws-cdk-lib";
import { Endpoints } from '../lib/api/endpoints';


test('Create endpoints - demoWebsite=true', () => {
  const stack = new Stack();
  // WHEN
  
  const myLmbda = new lambda.Function(stack, "MyLambda", {
    runtime: lambda.Runtime.NODEJS_16_X,
    code: lambda.Code.fromAsset("lambda/generate_token/nodejs"),
    handler: "index.handler",
  });

  new Endpoints(stack, "Endpoints", {
    generateTokenLambdaFunction: myLmbda,
    saveSessionToDDBLambdaFunction: myLmbda,
    updateTokenLambdaFunction: myLmbda,
    sig4LambdaVersionParamName: "sig4LambdaVersionParamName",
    sig4LambdaRoleArn: "sig4LambdaRoleArn",
    demo: true
  });
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
  template.resourceCountIs("AWS::CloudFront::Distribution", 1);
  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::S3::Bucket", 2);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);




});

test('Create endpoints - demoWebsite=false', () => {
  const stack = new Stack();
  // WHEN
  
  const myLmbda = new lambda.Function(stack, "MyLambda", {
    runtime: lambda.Runtime.NODEJS_16_X,
    code: lambda.Code.fromAsset("lambda/generate_token/nodejs"),
    handler: "index.handler",
  });

  new Endpoints(stack, "Endpoints", {
    generateTokenLambdaFunction: myLmbda,
    saveSessionToDDBLambdaFunction: myLmbda,
    updateTokenLambdaFunction: myLmbda,
    sig4LambdaVersionParamName: "sig4LambdaVersionParamName",
    sig4LambdaRoleArn: "sig4LambdaRoleArn",
    demo: false
  });
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
  template.resourceCountIs("AWS::CloudFront::Distribution", 1);
  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::S3::Bucket", 2);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);




});
