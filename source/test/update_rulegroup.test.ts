// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const update_rulegroup = require('../lambda/update_rulegroup/index.js');
import awsSdkMock from "./__mocks__/aws-sdk-mock";

describe('process.env', () => {
  const env = process.env;
  let mocks: any[] = [];

  beforeEach(() => {
      mocks = awsSdkMock.mockAllAWSClients();
      process.env = {  
        RULE_ID: "ca2a976c-1df0-41b2-9234-055318508a9b",
        RULE_NAME: "MYDEMO1_BlockSessions",
        RETENTION: "10",
        TABLE_NAME: "myTableName",
        MAX_SESSIONS: "50",
        GSI_INDEX_NAME: "MyGsiIndex",
    };
  })

  afterEach(() => {
      process.env = env;
      awsSdkMock.reseMocks(mocks);
  })



  test('Update rule group - Auto Session - result OK', async () => {

    var result = await update_rulegroup.handler({});

    expect(result.statusCode).toEqual(200);
  


 });





})

