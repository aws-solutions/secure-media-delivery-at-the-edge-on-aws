const generateTokenHandler = require('../lambda/generate_token/nodejs/index.js');
import awsSdkMock from "./__mocks__/aws-sdk-mock";

describe("Generate a token", () => {
    let mocks: any[] = [];

    beforeEach(() => {
        mocks = awsSdkMock.mockAllAWSClients();
    });

    afterEach(() => {
        awsSdkMock.reseMocks(mocks);
    });

    test('generate token - result 200', async () => {
      // arrange and act
      var myEvent = {
        version: '2.0',
        routeKey: 'GET /tokengenerate',
        rawPath: '/tokengenerate',
        rawQueryString: 'id=1',
        headers: {
          authorization: 'AWS4-HMAC-SHA256 Credential=ASIA4T2JZHUEPDUT7YH4/20220708/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-cf-id;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=5e5daea6b47e98ff3c3987c5de178837d2882f0ba8f21c7407cdd87ecba62370',
          'cloudfront-viewer-address': '52.94.36.25:29281',
          'cloudfront-viewer-country': 'GB',
          'cloudfront-viewer-country-region': 'Ile_France',
          'cloudfront-viewer-city': 'AA',
          'content-length': '0',
          host: 'f2utpitubd.execute-api.eu-west-1.amazonaws.com',
          referer: 'https://d3pzxppvzp3dd9.cloudfront.net/',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
        },
        queryStringParameters: { id: '1' },
      };

      var result = await generateTokenHandler.handler(myEvent);
  
      expect(result.playback_url).toHaveLength;

    });

    test('generate token - result 400', async () => {
        // arrange and act
        var myEvent = {
          version: '2.0',
          routeKey: 'GET /tokengenerate',
          rawPath: '/tokengenerate',
          headers: {
            authorization: 'AWS4-HMAC-SHA256 Credential=ASIA4T2JZHUEPDUT7YH4/20220708/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-cf-id;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=5e5daea6b47e98ff3c3987c5de178837d2882f0ba8f21c7407cdd87ecba62370',
            'cloudfront-viewer-address': '52.94.36.25:29281',
            'cloudfront-viewer-country': 'GB',
            'content-length': '0',
            host: 'f2utpitubd.execute-api.eu-west-1.amazonaws.com',
            referer: 'https://d3pzxppvzp3dd9.cloudfront.net/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
          },
        };
  
        var result = await generateTokenHandler.handler(myEvent);
    
        expect(result.statusCode).toBe(400);
  
      });
});
