// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsSMD = require('../resources/sdk/node/v1/aws-secure-media-delivery.js');
import awsSdkMock from "./__mocks__/aws-sdk-mock";

awsSMD.Token.setDEBUG(true);
awsSMD.Secret.setDEBUG(true);

let secret = new awsSMD.Secret('MyStack', 4);
secret.initSMClient();
let token = new awsSMD.Token(secret);


describe("Check token generation", () => {
  let mocks: any[] = [];
  beforeEach(() => {
      mocks = awsSdkMock.mockAllAWSClients();
  });

  afterEach(() => {
      awsSdkMock.reseMocks(mocks);
  });

  test("Without IP, token generated ", async () => {

    var viewer_attributes = {
      "ip": "192.168.1.1",
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': '54.240.197.233:31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': 'https://d19d5urzf66t53.cloudfront.net/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };
    var token_policy =
    {
      "co": false,
      "co_fallback": true,
      "cty": false,
      "cty_fallback": true,
      "exc": [
        "/ads/"
      ],
      "exp": "+3h",
      "headers": [
        "user-agent"
      ],
      "ip": false,
      "nbf": "1645000000",
      "paths": [
        "/out/v1/00c6ff982d404e2f940b48495b243b3c/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://mycloudfrontdomainname.com";
    const mediaUrl = "/out/v1/abcds/index.m3u";
    const res = await token.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    res.startsWith(cloudfrontDomainName)
    expect(res.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(res.endsWith(mediaUrl)).toBeTruthy();
  }, 70000);

  test("With IP, token generated", async () => {


    var viewer_attributes = {
      "ip": "192.168.1.1",
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': '54.240.197.233:31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': 'https://d19d5urzf66t53.cloudfront.net/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };
    var token_policy =
    {
      "co": false,
      "co_fallback": true,
      "cty": false,
      "cty_fallback": true,
      "exc": [
        "/ads/"
      ],
      "exp": "+3h",
      "headers": [
        "user-agent"
      ],
      "ip": true,
      "nbf": "1645000000",
      "paths": [
        "/out/v1/00c6ff982d404e2f940b48495b243b3c/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://mycloudfrontdomainname.com";
    const mediaUrl = "/out/v1/abcds/index.m3u";
    const res = await token.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    res.startsWith(cloudfrontDomainName)
    expect(res.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(res.endsWith(mediaUrl)).toBeTruthy();
  }, 70000);

  test("With country, token generated", async () => {


    var viewer_attributes = {
      "ip": "192.168.1.1",
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': '54.240.197.233:31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': 'https://d19d5urzf66t53.cloudfront.net/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };
    var token_policy =
    {
      "co": true,
      "co_fallback": true,
      "cty": false,
      "cty_fallback": true,
      "exc": [
        "/ads/"
      ],
      "exp": "+3h",
      "headers": [
        "user-agent"
      ],
      "ip": true,
      "nbf": "1645000000",
      "paths": [
        "/out/v1/00c6ff982d404e2f940b48495b243b3c/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://mycloudfrontdomainname.com";
    const mediaUrl = "/out/v1/abcds/index.m3u";
    const res = await token.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    res.startsWith(cloudfrontDomainName)
    expect(res.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(res.endsWith(mediaUrl)).toBeTruthy();
  }, 70000);



});







