import { Template } from 'aws-cdk-lib/assertions';
import {  Aws, aws_cloudfront as cloudfront, Stack,
} from 'aws-cdk-lib';
import { RotateSecretsWorkflow } from '../lib/main/rotate_secrets_workflow';
import { Secrets } from '../lib/main/secrets';
import { IConfiguration } from '../helpers/validators/configuration';

test('Rotate secrets workflow', () => {
  const stack = new Stack();
  // WHEN
  const secrets = new Secrets(stack, "Secrets");

  const checkToken = new cloudfront.Function(stack, "CheckJWTTokenFunction", {
    code: cloudfront.FunctionCode.fromFile({
      filePath: "lambda/generate_secret_update_cff/index.js",
    }),
    functionName: Aws.STACK_NAME + "_checkJWTToken",
    comment:
      "CloudFront Function used to check a JWT token",
  });

  const myConfig = {
    "main": {
      "stack_name": "CCCC1",
      "wcu": "100",
      "retention": "14",
      "rotate_secrets_frequency": "m"
    }
  };
  new RotateSecretsWorkflow(stack, 'RotateSecrets',
  {
    secrets: secrets,
    checkTokenFunction: checkToken,
    configuration: myConfig as IConfiguration,
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
  template.resourceCountIs("AWS::Lambda::Function", 3);
  template.resourceCountIs("Custom::AWS", 1);
  template.resourceCountIs("AWS::Logs::LogGroup", 3);


});
