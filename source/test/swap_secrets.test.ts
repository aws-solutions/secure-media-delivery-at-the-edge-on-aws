const swapSecrets = require('../lambda/swap_secrets/index.js');

jest.mock("aws-sdk")

describe('process.env', () => {
  const env = process.env

  beforeEach(() => {
      jest.resetModules()
      process.env = {  
        TEMPORARY_KEY_NAME: "myTemporaryKey",
        PRIMARY_KEY_NAME: "myPrimaryKey",
        SECONDARY_KEY_NAME: "mySecondaryKey"
       };
  })

  afterEach(() => {
      process.env = env
  })

  test('swap secrets - result 200', async () => {

    var result = await swapSecrets.handler({
    });
    expect(result).toEqual("OK");

  });



})

