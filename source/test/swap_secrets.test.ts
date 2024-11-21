// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const swapSecrets = require('../lambda/swap_secrets/index.js');
import awsSdkMock from "./__mocks__/aws-sdk-mock";

describe('process.env', () => {
  const env = process.env;
  let mocks: any[] = [];

  beforeEach(() => {
      mocks = awsSdkMock.mockAllAWSClients();
      process.env = {  
        TEMPORARY_KEY_NAME: "myTemporaryKey",
        PRIMARY_KEY_NAME: "myPrimaryKey",
        SECONDARY_KEY_NAME: "mySecondaryKey"
       };
  })

  afterEach(() => {
      process.env = env;
      awsSdkMock.reseMocks(mocks);
  })

  test('swap secrets - result 200', async () => {

    var result = await swapSecrets.handler({
    });
    expect(result).toEqual("OK");

  });



})

