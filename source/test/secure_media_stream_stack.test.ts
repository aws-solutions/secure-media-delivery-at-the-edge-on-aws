import { Template } from 'aws-cdk-lib/assertions';
import { 
  App
} from "aws-cdk-lib";
import { IConfiguration } from '../helpers/validators/configuration';
import { SecureMediaStreamingStack } from '../lib/secure_media_stream_stack';
import {getMainStackProps} from '../bin/secure_media_stream'
import packageJson from '../package.json';
import cdkJson from '../cdk.json';

const packageVersion = packageJson.version;
const cdkVersion = cdkJson.context.solution_version;

test('Main stack', () => {
  
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
  const stack = new SecureMediaStreamingStack( app,
    config.main.stack_name,
    config,
    getMainStackProps(config)
    );
  
  // THEN
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 10);
  template.resourceCountIs("AWS::Logs::LogGroup", 8);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);

});

test('package.json and cdk.json solution versions should match', () => {
  expect(packageVersion).toEqual(cdkVersion);
});
