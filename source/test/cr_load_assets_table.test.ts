// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from 'aws-cdk-lib/assertions';
import { CrLoadAssetsTable } from '../lib/custom_resources/cr_load_assets_table';
import { IConfiguration } from '../helpers/validators/configuration';
import {  aws_dynamodb as dynamodb, Stack
} from 'aws-cdk-lib';

test('Load assets', () => {
  const stack = new Stack();
  // WHEN

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
  const myTable = new dynamodb.Table(stack, 'Table', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
  });
  new CrLoadAssetsTable(stack, 'LoadAssetsTable', {
    table: myTable,
    configuration:  myConfig as IConfiguration
  })
  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::AWS", 1);
});
