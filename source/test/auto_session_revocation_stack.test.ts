// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from 'aws-cdk-lib/assertions';
import { 
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  Stack, App
} from "aws-cdk-lib";
import { IConfiguration } from '../helpers/validators/configuration';
import { SecureMediaStreamingStack } from '../lib/secure_media_stream_stack';
import {getMainStackProps, getAutoSessionStackProps} from '../bin/secure_media_stream'
import { AutoSessionRevocationStack } from '../lib/auto_revocation_stack';

test('Auto session revocation stack', () => {
  
  // WHEN  
  const app = new App();
  const config = {
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
  } as IConfiguration;
  
  const coreStack = new SecureMediaStreamingStack( app,
    config.main.stack_name,
    config,
    getMainStackProps(config)
    );
  
  
  const autoStack = new AutoSessionRevocationStack(
    app,
    config.main.stack_name + "AutoSessionRevocation",
    config,
    coreStack.sessionToRevoke,
    getAutoSessionStackProps()
  );

  const autoTemplate = Template.fromStack(autoStack);

  autoTemplate.resourceCountIs("AWS::Lambda::Function", 4);
  autoTemplate.resourceCountIs("AWS::Logs::LogGroup", 4);
  autoTemplate.resourceCountIs("AWS::StepFunctions::StateMachine", 1);

});
