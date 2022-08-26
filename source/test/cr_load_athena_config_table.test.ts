import { Template } from 'aws-cdk-lib/assertions';
import { CrLoadAssetsTable } from '../lib/custom_resources/cr_load_assets_table';
import { IConfiguration } from '../helpers/validators/configuration';
import {  aws_dynamodb as dynamodb, Stack
} from 'aws-cdk-lib';
import { CrLoadSqlParams } from '../lib/custom_resources/cr_load_athena_config_table';

test('Load athena config', () => {
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
      "trigger_workflow_frequency": 0,
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


  new CrLoadSqlParams(stack, 'LoatAthenaConfig', {
    table: myTable,
    configuration:  myConfig as IConfiguration
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
});
