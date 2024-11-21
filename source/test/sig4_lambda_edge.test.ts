// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const lambdaEdge = require('../lambda/custom_resource_us_east_1/le.js');



describe('Sign request', () => {

    const env = process.env

    beforeEach(() => {
        jest.resetModules()
        process.env = {  
            AWS_ACCESS_KEY_ID : "MyAccessKey",
            AWS_SECRET_ACCESS_KEY: "MySecretKey",
            AWS_SESSION_TOKEN : "MySessionToken"
            };
    })

    afterEach(() => {
        process.env = env
    })

    
  test('Sign sig4 request - result OK', async () => {
    var myEvent = {
        "Records": [
            {
                "cf": {
                    "config": {
                        "distributionDomainName": "abcdefgh.cloudfront.net",
                        "distributionId": "E1DX8M92DB5ED4",
                        "eventType": "origin-request",
                        "requestId": "DkgSZ2pqoTUDjmGml95zkDQ8PQU4hvfhu4S4aaG4YoFT1iDorhE84A=="
                    },
                    "request": {
                        "clientIp": "2a01:cb00:694:c800:6c3f:bb44:b79c:b3ac",
                        "headers": {
                            "host": [
                                {
                                    "key": "Host",
                                    "value": "abcdefgh.execute-api.us-east-1.amazonaws.com"
                                }
                            ],
                            "x-forwarded-for": [
                                {
                                    "key": "X-Forwarded-For",
                                    "value": "2a01:cb00:694:c800:6c3f:bb44:b79c:b3ac"
                                }
                            ],
                            "user-agent": [
                                {
                                    "key": "User-Agent",
                                    "value": "Amazon CloudFront"
                                }
                            ],
                            "via": [
                                {
                                    "key": "Via",
                                    "value": "1.1 3a28bbccbd5f062ce989b39db1188300.cloudfront.net (CloudFront)"
                                }
                            ]
                        },
                        "method": "GET",
                        "origin": {
                            "custom": {
                                "customHeaders": {},
                                "domainName": "abcdefgh.execute-api.us-east-1.amazonaws.com",
                                "keepaliveTimeout": 5,
                                "path": "",
                                "port": 443,
                                "protocol": "https",
                                "readTimeout": 30,
                                "sslProtocols": [
                                    "TLSv1.2"
                                ]
                            }
                        },
                        "querystring": "",
                        "uri": "/"
                    }
                }
            }
        ]
    }
    var result = await lambdaEdge.handler(myEvent);
    expect(result).toHaveLength;

 });



})

