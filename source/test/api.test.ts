import { Template } from 'aws-cdk-lib/assertions';
import { IConfiguration } from '../helpers/validators/configuration';
import {  aws_dynamodb as dynamodb, Stack
} from 'aws-cdk-lib';
import { Api } from '../lib/api/api';
import { Secrets } from '../lib/main/secrets';
import { CWDashboard } from '../lib/main/dashboard';

test('Create Api - demo=true', () => {
  const stack = new Stack();
  // WHEN

  const secrets = new Secrets(stack, "Secrets");
  const dashboard = new CWDashboard(stack, "CoreDashboard");
  const myTable = new dynamodb.Table(stack, 'Table', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
  });
  const myConfig = {
    "main": {
      "stack_name": "MYSTREAM",
      "assets_bucket_name" : "MY_ASSETS_BUCKET_NAME",
      "rotate_secrets_frequency": "1m",
      "rotate_secrets_pattern": "P",
      "wcu": "100",
      "retention": "14"
    },
    "api": {
      "demo": true
  
    },
    "hls": {
      "hostname": "H",
      "url_path": "U",
      "ttl": "+3h"
    },
    "dash": {
      "hostname": "H",
      "url_path": "U",
      "ttl": "+24h"
    }
  };
  
  
  new Api(stack, 'Api', {
    configuration: myConfig as IConfiguration,
    secrets: secrets,
    dashboard: dashboard,
    sessionsTable: myTable,
    sig4LambdaVersionParamName: "sig4LambdaVersionParamName",
    sig4LambdaRoleArn: "sig4LambdaRoleArn"
    
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::LayerVersion", 2);
  template.resourceCountIs("AWS::DynamoDB::Table", 2);
  template.resourceCountIs("Custom::AWS", 2);
  template.resourceCountIs("AWS::Lambda::Function", 5);
  template.resourceCountIs("AWS::Logs::LogGroup", 4);


  

});

test('Create Api - demo=false', () => {
  const stack = new Stack();
  // WHEN

  const secrets = new Secrets(stack, "Secrets");
  const dashboard = new CWDashboard(stack, "CoreDashboard");
  const myTable = new dynamodb.Table(stack, 'Table', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
  });
  const myConfig = {
    "main": {
      "stack_name": "MYSTREAM",
      "assets_bucket_name" : "MY_ASSETS_BUCKET_NAME",
      "rotate_secrets_frequency": "1m",
      "rotate_secrets_pattern": "P",
      "wcu": "100",
      "retention": "14"
    },
    "api": {
      "demo": false
  
    },
    "hls": {
      "hostname": "H",
      "url_path": "U",
      "ttl": "+3h"
    },
    "dash": {
      "hostname": "H",
      "url_path": "U",
      "ttl": "+24h"
    }
  };
  
  
  new Api(stack, 'Api', {
    configuration: myConfig as IConfiguration,
    secrets: secrets,
    dashboard: dashboard,
    sessionsTable: myTable,
    sig4LambdaVersionParamName: "sig4LambdaVersionParamName",
    sig4LambdaRoleArn: "sig4LambdaRoleArn"
    
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::LayerVersion", 2);
  template.resourceCountIs("AWS::DynamoDB::Table", 2);
  template.resourceCountIs("Custom::AWS", 2);
  template.resourceCountIs("AWS::Lambda::Function", 5);
  template.resourceCountIs("AWS::Logs::LogGroup", 4);


  

});

