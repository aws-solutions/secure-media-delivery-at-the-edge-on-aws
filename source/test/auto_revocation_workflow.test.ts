// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from 'aws-cdk-lib/assertions';
import { 
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  Stack
} from "aws-cdk-lib";
import { AutoRevokeSessionsWorkflow } from '../lib/autorevocation/auto_revocation_workflow';
import { IConfiguration } from '../helpers/validators/configuration';


test('Auto revocation session', () => {
  const stack = new Stack();
  // WHEN
  
  const myTable = new dynamodb.Table(stack, 'Table', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
  });

  const myConfig = {
    "main": {
      "stack_name": "MYSTACK",
      "wcu": "100",
      "retention": "14",
      "rotate_secrets_frequency": "m"
    },
    "api": {
      "demo": false
    },
    "sessionRevocation": {
      "trigger_workflow_frequency": 10,
      "db_name": "default",
      "table_name": "cloudfront_logs",
      "request_ip_column": "requestip",
      "ua_column_name": "useragent",
      "referer_column_name": "referrer",
      "uri_column_name": "uri",
      "status_column_name": "status",
      "response_bytes_column_name": "bytes",
      "date_column_name": "date",
      "time_column_name": "time",
      "lookback_period": 10,
      "ip_penalty": 1,
      "ip_rate": 1,
      "referer_penalty": 1,
      "ua_penalty": 1,
      "min_sessions_number": 3,
      "min_session_duration": 30,
      "score_threshold": 2.2,
      "partitioned": 0
    }
  };

  new AutoRevokeSessionsWorkflow(
    stack,
    "GetSessions",
    {
      bucket: new s3.Bucket(stack, "SqlQuery"),
      dynamodbTable: myTable,
      configuration: myConfig as IConfiguration
    }
  );

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 2);
  template.resourceCountIs("AWS::Logs::LogGroup", 3);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);


});
