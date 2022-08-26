import { Template } from 'aws-cdk-lib/assertions';
import {  Stack
} from 'aws-cdk-lib';
import { CRCreateLEWafRule } from '../lib/custom_resources/cr_create_le_rule';

test('Create L@E - DEPLOY_LE=true', () => {
  const stack = new Stack();
  // WHEN

  new CRCreateLEWafRule(stack, 'Secrets', {
    WCU: "1",
    LAMBDA_EDGE_VERSION_SSM_PARAM: "LAMBDA_EDGE_VERSION_SSM_PARAM",
    WAF_RULE_NAME_SSM_PARAM: "WAF_RULE_NAME_SSM_PARAM",
    WAF_RULE_ID_SSM_PARAM: "WAF_RULE_ID_SSM_PARAM",
    DEPLOY_LE: true
    
  })

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 2);
  

});

test('Create L@E - DEPLOY_LE=false', () => {
  const stack = new Stack();
  // WHEN

  new CRCreateLEWafRule(stack, 'Secrets', {
    WCU: "1",
    LAMBDA_EDGE_VERSION_SSM_PARAM: "LAMBDA_EDGE_VERSION_SSM_PARAM",
    WAF_RULE_NAME_SSM_PARAM: "WAF_RULE_NAME_SSM_PARAM",
    WAF_RULE_ID_SSM_PARAM: "WAF_RULE_ID_SSM_PARAM",
    DEPLOY_LE: false
    
  })

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 2);
  

});
