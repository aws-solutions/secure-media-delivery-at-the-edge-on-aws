const updateToken = require('../lambda/update_token/index.js');

jest.mock("aws-sdk")

describe('process.env', () => {
  const env = process.env
  beforeEach(() => {
    jest.resetModules()
    process.env = {  
      TABLE_NAME: "myTableName",
  };
})

afterEach(() => {
    process.env = env
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

