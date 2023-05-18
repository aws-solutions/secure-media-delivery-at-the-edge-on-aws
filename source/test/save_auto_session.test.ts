const saveAutoSession = require('../lambda/save_auto_session/index.js');

jest.mock("aws-sdk")

describe('process.env', () => {
  const env = process.env

  beforeEach(() => {
      jest.resetModules()
      process.env = {  
        TTL: "2",
        TABLE_NAME: "myTable"
       };
  })

  afterEach(() => {
      process.env = env
  })

  test('Save auto session - non array event', async () => {

    try {
      var result = await saveAutoSession.handler({
        "key1": "value1",
        "key2": "value2",
        "key3": "value3"
      });
      
  } catch (e) {
    expect((e as Error).message).toBe("Event received must be an array with at least 2 elements");
  }

  });

  test('Save auto session - array event', async () => {

    var result = await saveAutoSession.handler(
      [
        {
           "Data":[
              {
                 "VarCharValue":"zazz"
              },
              
           ]
        },
        {
           "Data":[
              {
                 "VarCharValue":"sessionid1"
              },
              {
                 "VarCharValue":"1234561"
              },
              {
                 "VarCharValue":"4567854"
              },
              {
                 "VarCharValue":"123332"
              },
              {
                 "VarCharValue":"456544"
              },
              {
                 "VarCharValue":"1111222"
              }
           ]
        }
     ]
    );

    expect(result).toEqual("OK");
      

  });





})

