// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsSMD1 = require('../resources/sdk/node/v1/aws-secure-media-delivery.js');
const cff1 = require("../lambda/generate_secret_update_cff/cff.js");
import awsSdkMock from "./__mocks__/aws-sdk-mock";

awsSMD1.Token.setDEBUG(true);
awsSMD1.Secret.setDEBUG(true);

let secret1 = new awsSMD1.Secret('MyStack', 4);
secret1.initSMClient();
let token1 = new awsSMD1.Token(secret1);

const addMock = jest.spyOn(cff1, "decodeString");

addMock.mockImplementation( param => {
  return Buffer.from(String(param), 'base64').toString();
} );

describe("Check token generation", () => {
  let mocks: any[] = [];
  beforeEach(() => {
      mocks = awsSdkMock.mockAllAWSClients();
  });

  afterEach(() => {
      awsSdkMock.reseMocks(mocks);
  })

  test("Check token - valid token, ip=false ", async () => {

    const myIp = "54.240.197.233";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': myIp + ':31830',
        'cloudfront-viewer-country': 'IE',
        'cloudfront-viewer-country-region': 'Ile_France',
        'cloudfront-viewer-city': 'AA',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };

    var token_policy =
    {
      "co": true,
      "co_fallback": true,
      "cty": true,
      "reg": true,
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

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length;
    const myPath = playbackUrl.substring(start);

    playbackUrl.startsWith(cloudfrontDomainName)
    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    
    expect(result.method).toBe("GET");

  }, 70000);

  
  test("Check token - valid token, ip=true", async () => {

    const myIp = "54.240.197.233";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': myIp + ':31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
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

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length;
    const myPath = playbackUrl.substring(start);

    playbackUrl.startsWith(cloudfrontDomainName)
    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    
    expect(result.method).toBe("GET");

  }, 70000);


  test("Check token - valid token, co fallback ", async () => {

    const myIp = "54.240.197.233";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': myIp + ':31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
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
      "ip": false,
      "nbf": "1645000000",
      "paths": [
        "/out/v1/00c6ff982d404e2f940b48495b243b3c/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length;
    const myPath = playbackUrl.substring(start);

    playbackUrl.startsWith(cloudfrontDomainName)
    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    
    expect(result.method).toBe("GET");

  }, 70000);


  test("Check token - valid token, region fallback ", async () => {

    const myIp = "54.240.197.233";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "headers": {
        'cloudfront-viewer-address': myIp + ':31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };

    var token_policy =
    {
      "co": true,
      "co_fallback": true,
      "reg": true,
      "reg_fallback": true,
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

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length;
    const myPath = playbackUrl.substring(start);

    playbackUrl.startsWith(cloudfrontDomainName)
    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    
    expect(result.method).toBe("GET");

  }, 70000);

  test("Check token - token not valid yet", async () => {

    const myIp = "54.240.197.233";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "headers": {
        'cloudfront-viewer-address': myIp + ':31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
        'via': '1.1 f9e2b62bbab7f16f69e97695da81e608.cloudfront.net (CloudFront)',
      }
    };

    var token_policy =
    {
      "co": true,
      "co_fallback": true,
      "reg": true,
      "reg_fallback": true,
      "exc": [
        "/ads/"
      ],
      "exp": "+3h",
      "headers": [
        "user-agent"
      ],
      "ip": false,
      "nbf": "4118570281",
      "paths": [
        "/out/v1/00c6ff982d404e2f940b48495b243b3c/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length;
    const myPath = playbackUrl.substring(start);

    playbackUrl.startsWith(cloudfrontDomainName)
    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    expect(result.statusCode).toBe(401);
    expect(result.statusDescription).toBe("Unauthorized");

  }, 70000);

  test("Check token - different user agent ", async () => {

    const myIp = "MY_IP";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': '54.240.197.233:31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': 'Chrome/103.0.0.0 Safari/537.36',
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

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u";
    const playbackUrl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length + 1;
    const myPath = playbackUrl.substring(start)


    expect(playbackUrl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playbackUrl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    expect(result.statusCode).toBe(401);
    expect(result.statusDescription).toBe("Unauthorized");

  }, 70000);

  test("Check token - different path ", async () => {

    const myIp = "MY_IP";
    const myReferer =  'https://mycloudfrontdomainname.cloudfront.net';
    const myUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0';


    var viewer_attributes = {
      "ip": myIp,
      "co": "FRANCE",
      "reg": "ILE DE FRANCE",
      "cty": "PARIS",
      "headers": {
        'cloudfront-viewer-address': '54.240.197.233:31830',
        'cloudfront-viewer-country': 'IE',
        'content-length': '0',
        'host': 'un25b5wnf5.execute-api.eu-west-1.amazonaws.com',
        'referer': myReferer,
        'user-agent': myUserAgent,
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
        "/out/v1/abcd/"
      ],
      "session_auto_generate": 12,
      "ssn": true
    };

    const cloudfrontDomainName = "https://videoassetcloudfrontdomainname.com";
    const mediaUrl = "/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u8";
    const playBackurl = await token1.generate(viewer_attributes, `${cloudfrontDomainName}${mediaUrl}`, token_policy);
    var start = cloudfrontDomainName.length + 1;
    const myPath = playBackurl.substring(start)
    expect(playBackurl.startsWith(cloudfrontDomainName)).toBeTruthy();
    expect(playBackurl.endsWith(mediaUrl)).toBeTruthy();
    var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": myIp
      },
      "request": {
        "method": "GET",
        "uri": myPath,
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": myUserAgent
          },
          "referer": {
            "value": myReferer
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };

    const result = cff1.handler(cffEvent);
    expect(result.statusCode).toBe(401);
    expect(result.statusDescription).toBe("Unauthorized");

  }, 70000);



});







