// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from 'aws-cdk-lib/assertions';
import {
  Stack
} from "aws-cdk-lib";
import { GetInputParameters } from '../lib/cfn/check_input_parameters';
import { IConfiguration } from '../helpers/validators/configuration';


test('Check input param - cdk', () => {
  const stack = new Stack();
  // WHEN

  const myConfig = {
    "main": {
      "stack_name": "MYSTACK",
      "wcu": "100",
      "retention": "14",
      "rotate_secrets_frequency": "m",
      "metrics": true
    },
    "api": {
      "demo": false
    }
  };

  new GetInputParameters(stack, "InputParameters", myConfig as IConfiguration);
  
  // THEN
  const template = Template.fromStack(stack);
  expect(Object.keys(template.toJSON().Parameters).length).toEqual(1);

});

test('Check input param - cfn', () => {
  const stack = new Stack();
  // WHEN

  const myConfig = {
    "main": {
      "stack_name": "MYSTREAM",
      "assets_bucket_name" : "MY_ASSETS_BUCKET_NAME",
      "rotate_secrets_frequency": "1m",
      "rotate_secrets_pattern": "P",
      "wcu": "100",
      "retention": "14",
      "metrics": true
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

  new GetInputParameters(stack, "InputParameters", myConfig as IConfiguration);

  // THEN
  const template = Template.fromStack(stack);
  expect(Object.keys(template.toJSON().Parameters).length).toEqual(13);
});

test('Check input param - cdk hls & dash', () => {
  const stack = new Stack();
  // WHEN

  const myConfig = {
    "main": {
      "stack_name": "MYSTREAM",
      "assets_bucket_name" : "MY_ASSETS_BUCKET_NAME",
      "rotate_secrets_frequency": "1m",
      "rotate_secrets_pattern": "m",
      "wcu": "100",
      "retention": "14",
      "metrics": true
    },
    "api": {
      "demo": true
  
    },
    "hls": {
      "hostname": "myhostname",
      "url_path": "mypath",
      "ttl": "+3h"
    },
    "dash": {
      "hostname": "myhostname",
      "url_path": "mypath",
      "ttl": "+24h"
    }
  };

  new GetInputParameters(stack, "InputParameters", myConfig as IConfiguration);

  // THEN
  const template = Template.fromStack(stack);
  console.log(template)
  expect(Object.keys(template.toJSON().Parameters).length).toEqual(1);
});

