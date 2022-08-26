const revokeSessionHandler = require('../lambda/save_manual_session/nodejs/index.js');

jest.mock("aws-sdk")
const awsSMD2 = require('../resources/sdk/node/v1/aws-secure-media-delivery.js');
awsSMD2.Session.initialize("MY_TABLE");
awsSMD2.Session.setDEBUG(true);

describe("Save manual session", () => {

    test('Save session - result 200', async () => {
      var myEvent = {
        version: '2.0',
        routeKey: 'GET /sessionrevoke',
        rawPath: '/sessionrevoke',
        rawQueryString: 'sessionid=abcdef',
        queryStringParameters: { sessionid: 'abcdef' },
      };

      var result = await revokeSessionHandler.handler(myEvent);

      expect(result.statusCode).toBe(200);

    });

    test('Save session - result 400', async () => {
      var myEvent = {
        version: '2.0',
        routeKey: 'GET /sessionrevoke',
      };

      var result = await revokeSessionHandler.handler(myEvent);

      expect(result.statusCode).toBe(400);

    });
});
