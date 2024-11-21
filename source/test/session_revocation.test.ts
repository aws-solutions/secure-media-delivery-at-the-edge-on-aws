// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from 'aws-cdk-lib/assertions';
import { 
  aws_dynamodb as dynamodb,
  Stack
} from "aws-cdk-lib";
import { SessionRevocation } from '../lib/main/session_revocation';
import { IConfiguration } from '../helpers/validators/configuration';


test('Session revocation', () => {
  const stack = new Stack();
  // WHEN
  
  const myTable = new dynamodb.Table(stack, 'Table', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    stream: dynamodb.StreamViewType.KEYS_ONLY,
  });

  const config = {
    "main": {
      "stack_name": "MYSTACK",
      "wcu": "100",
      "retention": "14",
      "rotate_secrets_frequency": "m"
    }
  } as IConfiguration;

  new SessionRevocation(stack, "SessionRevocation", {
    sessionToRevoke: myTable,
    gsi_index_name: "GSI_NAME",
    ruleNameParamName: "WAF_RULE_NAME_SSM_PARAM",
    ruleIdParamName: "WAF_RULE_ID_SSM_PARAM",
    configuration: config
  });

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
  template.resourceCountIs("AWS::Lambda::Function", 2);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);



});
