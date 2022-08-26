import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { Secrets } from '../lib/main/secrets';

test('Secrets Created', () => {
  const stack = new cdk.Stack();
  // WHEN
  new Secrets(stack, 'Secrets')
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::SecretsManager::Secret", 3);
});
