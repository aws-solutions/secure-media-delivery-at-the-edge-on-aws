import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { CrInitSecrets } from '../lib/custom_resources/cr_init_secrets';

test('Init secrets', () => {
  const stack = new cdk.Stack();
  // WHEN
  new CrInitSecrets(stack, 'Secrets', {
    functionArn: "functionArn",
    functionName : "functionName"
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
});
