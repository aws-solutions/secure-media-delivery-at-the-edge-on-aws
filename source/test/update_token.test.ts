// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const updateToken = require('../lambda/update_token/index.js');
import awsSdkMock from "./__mocks__/aws-sdk-mock";

describe('process.env', () => {
  const env = process.env;
  let mocks: any[] = [];
  beforeEach(() => {
      mocks = awsSdkMock.mockAllAWSClients();
      process.env = {  
        TABLE_NAME: "myTableName",
      };
  })

  afterEach(() => {
      process.env = env;
      awsSdkMock.reseMocks(mocks);
  })

  test('Update token - result OK', async () => {
    const event = {
      "queryStringParameters":{
         "id":"1",
         "ip":"0",
         "referer":"0",
         "ua":"0"
      },
   }
    var result = await updateToken.handler(event);
    console.log(result)
    expect(result.statusCode).toEqual(200);
  


 });





})

