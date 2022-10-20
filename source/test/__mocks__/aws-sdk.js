const mockSecretData = {
  ARN: 'x',
  Name: 'my_secret',
  SecretString: '{"secret1_key_to_replace":"secret1_value_to_replace"}',
}

class AWS {

  static SecretsManager = class {

    getSecretValue = jest.fn(secretId => {
      return {
        promise: function () {
          return mockSecretData;
        }
      };
    }
    )

    putSecretValue = jest.fn(secretId => {
      return {
        promise: function () {
          return "";
        }
      };
    }
    )
  }

  static DynamoDB = class {

    static DocumentClient = class {
      get = jest.fn().mockImplementation(() => ({
        promise: function () {
          return {
            "Item": {
              "url_path": "/out/v1/abcd/index.m3u8",
              "id": "1",
              "endpoint_hostname": "https://aaaaaa.cloudfront.net",
              "token_policy": {
                "headers": [
                  "user-agent"
                ],
                "exc": [
                  "/ads/"
                ],
                "nbf": "1645000000",
                "session_auto_generate": 12,
                "cty_fallback": true,
                "paths": [
                  "/out/v1/abcd/"
                ],
                "ip": false,
                "cty": true,
                "co_fallback": true,
                "co": true,
                "reg": true,
                "exp": "+3h",
                "ssn": true
              }
            }
          };
        }
      }));

      update = jest.fn().mockImplementation(() => ({
        promise: function () {
          return "";
        }
      }));

      
    }

    putItem = jest.fn().mockImplementation(() => ({
      promise: function () {
        return "";
      }
    }));



    query = jest.fn(param => {
      return {
        promise: function () {
          return {
            "Items": [
              { "last_updated": { "N": "1658409174" }, "score": { "N": "1234561" }, "reason": { "S": "COMPROMISED" }, "session_id": { "S": "sessionid1" }, "type": { "S": "AUTO" } },
              { "last_updated": { "N": "1658409174" }, "score": { "N": "1234561" }, "reason": { "S": "COMPROMISED" }, "session_id": { "S": "sessionid2" }, "type": { "S": "MANUAL" } }
            ], "Count": 1, "ScannedCount": 1
          }
        }
      };
    }
    )

  }

  static IAM = class {

    createPolicy = jest.fn(param => {
      return {
        promise: function () {

        }
      };
    }
    )

    attachRolePolicy = jest.fn(param => {
      return {
        promise: function () {

        }
      };
    }
    )
  }

  static Lambda = class {

    updateFunctionConfiguration = jest.fn(param => {
      return {
        promise: function () {

        }
      };
    })

    createFunction = jest.fn(param => {
      return {
        promise: function () {
          return {
            "FunctionArn": "MyFunctionArn"
          }
        }
      };
    })

    getFunctionConfiguration = jest.fn(param => {
      return {
        promise: function () {
          return {
            "FunctionArn": "MyFunctionArn",
            "State": "Active"
          }
        }
      };
    })

    publishVersion = jest.fn(param => {
      return {
        promise: function () {
          return {
            "Version": "1",

          }
        }
      };
    })


  }

  static WAFV2 = class {

    getRuleGroup = jest.fn(param => {
      return {
        promise: function () {
          return {
            "RuleGroup": {
              "Name": "MYDEMO1_BlockSessions",
              "Id": "ca2a976c-1df0-41b2-9234-055318508a9b",
              "Capacity": 100,
              "ARN": "arn:aws:wafv2:myregion:xxccvvbb:global/rulegroup/MYDEMO1_BlockSessions/ca2a976c-1df0-41b2-9234-055318508a9b",
              "Description": "TokenRevoke",
              "Rules": [
                {
                  "Name": "91cb0cb58022fa04",
                  "Priority": 1,
                  "Statement": {
                    "ByteMatchStatement": {
                      "SearchString": {
                        "type": "Buffer",
                        "data": [
                          115,
                          101,
                          115,
                          115,
                          105,
                          111,
                          110,
                          105,
                          100,
                          49
                        ]
                      },
                      "FieldToMatch": {
                        "UriPath": {

                        }
                      },
                      "TextTransformations": [
                        {
                          "Priority": 0,
                          "Type": "NONE"
                        }
                      ],
                      "PositionalConstraint": "STARTS_WITH"
                    }
                  },
                  "Action": {
                    "Block": {

                    }
                  },
                  "VisibilityConfig": {
                    "SampledRequestsEnabled": true,
                    "CloudWatchMetricsEnabled": true,
                    "MetricName": "Example"
                  }
                }
              ],
              "VisibilityConfig": {
                "SampledRequestsEnabled": false,
                "CloudWatchMetricsEnabled": false,
                "MetricName": "metricName"
              },
              "LabelNamespace": "awswaf:xxccvvbb:rulegroup:MYDEMO1_BlockSessions:"
            },
            "LockToken": "1946fbfd-9677-41e7-8f8b-3c75192ac2e5"
          }
        }
      };
    }
    )

    updateRuleGroup = jest.fn(param => {
      return {
        promise: function () {

        }
      };
    }
    )

    createRuleGroup = jest.fn(param => {
      return {
        promise: function () {
          return {
            "Summary": {
              "Id": "abc"
            }
          }
        }
      };
    }
    )


  }


  static CloudFront = class {

    describeFunction = jest.fn(param => {
      return {
        promise: function () {
          return mockSecretData;
        }
      };
    }
    )

    updateFunction = jest.fn(param => {
      return {
        promise: function () {
          return "";
        }
      };
    }
    )

    publishFunction = jest.fn(param => {
      return {
        promise: function () {
          return "";
        }
      };
    }
    )
  }


  static SSM = class {

    putParameter = jest.fn(param => {
      return {
        promise: function () {
          return {
            "Parameter": "abcd"
          }
        }
      };
    }
    )


  }




}


module.exports = AWS