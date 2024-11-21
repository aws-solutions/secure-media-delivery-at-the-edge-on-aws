// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CfnCondition, CfnParameter, Fn } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";
import { addParametersToInterface } from "./cfn_parameters";

//Construct used to implement input parameters when the user deploys the stack using CloudFormation template and not using the wizard and CDK
export class GetInputParameters extends Construct {

  public readonly customInputParameters = {} as IConfiguration;

  constructor(scope: Construct, id: string, configuration: IConfiguration) {
    super(scope, id);

    let returnObject: IConfiguration;

    if (configuration.main.rotate_secrets_pattern === "P") {

      const wcu = new CfnParameter(this, "Wcu", {
        type: "Number",
        minValue: 2,
        maxValue: 1500,
        default: 100,
        description:
          "Capacity limit expressed in WCUs for WAF Rule Group to keep the session list that should be blocked (between 2 and 1500).",
      });


      const retention = new CfnParameter(this, "Retention", {
        type: "Number",
        minValue: 1,
        default: 30,
        description:
          "Retention time for compromised sessions (in minutes)",
      });


      const hours = new CfnParameter(this, "Hours", {
        type: "String",
        allowedValues: [
          "00",
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "23",
        ],
        description:
          "An hour when key rotation workflow will be triggered.",
      });

      const minutes = new CfnParameter(this, "Minutes", {
        type: "String",
        allowedValues: [
          "00",
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "23",
          "24",
          "25",
          "26",
          "27",
          "28",
          "29",
          "30",
          "31",
          "32",
          "33",
          "34",
          "35",
          "36",
          "37",
          "38",
          "39",
          "40",
          "41",
          "42",
          "43",
          "44",
          "45",
          "46",
          "47",
          "48",
          "49",
          "50",
          "51",
          "52",
          "53",
          "54",
          "55",
          "56",
          "57",
          "58",
          "59",
        ],
        description:
          "A minute in the selected hour when key rotation workflow will be triggered.",
      });

      const day_of_week = new CfnParameter(this, "DayOfTheWeek", {
        type: "String",
        allowedValues: ["1", "2", "3", "4", "5", "6", "7"],
        description:
          "After selecting a week in a month, provide a specific day in that week when key rotation should occur. Value from 1 to 7, where 1 means Monday and 7 means Sunday.",
      });

      const week_of_month = new CfnParameter(this, "WeekOfTheMonth", {
        type: "String",
        allowedValues: ["1", "2", "3", "4"],
        description:
          "Specify the week number in each month that key rotation will be scheduled for. This parameter can be set to a value from a range 1 to 4.",
      });

      addParametersToInterface({
        params: [
          {
            scope: this,
            parameter: retention,
            groupLabel: "Session Revocation",
            parameterLabel: "Retention",
          },
          {
            scope: this,
            parameter: wcu,
            groupLabel: "Session Revocation",
            parameterLabel: "Wcu",
          },
          {
            scope: this,
            parameter: week_of_month,
            groupLabel: "Key Rotation Frequency",
            parameterLabel: "Week of the month",
          },
          {
            scope: this,
            parameter: day_of_week,
            groupLabel: "Key Rotation Frequency",
            parameterLabel: "Day of the week",
          },
          {
            scope: this,
            parameter: hours,
            groupLabel: "Key Rotation Frequency",
            parameterLabel: "Hours",
          },
          {
            scope: this,
            parameter: minutes,
            groupLabel: "Key Rotation Frequency",
            parameterLabel: "Minutes",
          }

        ],
      });


      returnObject = {
        main: {
          stack_name: "MYSTREAM",
          rotate_secrets_frequency: "1m",
          rotate_secrets_pattern: minutes.valueAsString + " " + hours.valueAsString + " ? * " + day_of_week.valueAsString +  "#" + week_of_month.valueAsString + " *",
          wcu: wcu.valueAsString,
          retention: retention.valueAsString,
          metrics: true
        },
      };
    } else {
      returnObject = {
        main: {
          stack_name: "MYSTREAM",
          rotate_secrets_frequency: configuration.main.rotate_secrets_frequency,
          rotate_secrets_pattern: configuration.main.rotate_secrets_pattern,
          wcu: configuration.main.wcu,
          retention: configuration.main.retention,
          metrics: configuration.main.metrics
        },
      };
    }

    if (configuration.dash) {
      returnObject.dash = {
        hostname: configuration.dash?.hostname,
        url_path: configuration.dash?.url_path,
        ttl: configuration.dash?.ttl,
      };

      if (configuration.dash?.hostname === "H") {
        const dash_hostname = new CfnParameter(this, "DashHostName", {
          type: "String",
          description: "Domain name served by CloudFront distribution hosting video following protocol prefix (http:// or https://).  If not specified, example values will be populated."
        });

        const dash_url_path = new CfnParameter(this, "DashUrlPath", {
          type: "String",
          description: "Full URL path of the video asset. This parameter must start with ‘/’ and point to an object used by the player to initiate a playback, like master manifest (mpd file). If not specified, example values will be populated."
        });

        const dash_ttl = new CfnParameter(this, "DashTtl", {
          type: "String",
          description: "Time period determining for how long newly issued token will be valid. If not specified, example values will be populated.",
          allowedValues: ["", "+30m", "+1h", "+3h", "+6h", "+24h"]
        });

        addParametersToInterface({
          params: [
            {
              scope: this,
              parameter: dash_hostname,
              groupLabel: "DASH stream",
              parameterLabel: "Hostname for asset delivery (Optional)",
            },
            {
              scope: this,
              parameter: dash_url_path,
              groupLabel: "DASH stream",
              parameterLabel: "Url path for asset delivery (Optional)",
            },
            {
              scope: this,
              parameter: dash_ttl,
              groupLabel: "DASH stream",
              parameterLabel: "TTL for token (Optional)",
            },
          ],
        });

        const dashHostCondition = new CfnCondition(this, 'DashHostCondition', { expression: Fn.conditionEquals(dash_hostname, '') });
        const dashPathCondition = new CfnCondition(this, 'DashPathCondition', { expression: Fn.conditionEquals(dash_url_path, '') });
        const dashTtlCondition = new CfnCondition(this, 'DashTtlCondition', { expression: Fn.conditionEquals(dash_ttl, '') });


        returnObject.dash = {
          hostname: Fn.conditionIf(dashHostCondition.logicalId, "https://d123.cloudfront.net", dash_hostname.valueAsString).toString(),
          url_path: Fn.conditionIf(dashPathCondition.logicalId, "/video/2/index.mpd", dash_url_path.valueAsString).toString(),
          ttl: Fn.conditionIf(dashTtlCondition.logicalId, "+30m", dash_ttl.valueAsString).toString()
        };
      }
    } else {
      returnObject.dash = {
        hostname: "https://d123.cloudfront.net",
        url_path: "/video/2/index.mpd",
        ttl: "+30m",
      };
    }

    if (configuration.hls) {
      returnObject.hls = {
        hostname: configuration.hls?.hostname,
        url_path: configuration.hls?.url_path,
        ttl: configuration.hls?.ttl,
      };

      if (configuration.hls?.hostname === "H") {

        const hls_hostname = new CfnParameter(this, "HlsHostName", {
          type: "String",
          description: "Domain name served by CloudFront distribution hosting video following protocol prefix (http:// or https://). If not specified, example values will be populated."
        });

        const hls_url_path = new CfnParameter(this, "HlsUrlPath", {
          type: "String",
          description: "Full URL path of the video asset. This parameter must start with ‘/’ and point to an object used by the player to initiate a playback, like master manifest (mpd file). If not specified, example values will be populated."
        });

        const hls_ttl = new CfnParameter(this, "HlsTtl", {
          type: "String",
          description: "Time period determining for how long newly issued token will be valid. If not specified, example values will be populated.",
          allowedValues: ["", "+30m", "+1h", "+3h", "+6h", "+24h"]
        });

        addParametersToInterface({
          params: [
            {
              scope: this,
              parameter: hls_hostname,
              groupLabel: "HLS stream",
              parameterLabel: "Hostname for asset delivery (Optional)",
            },
            {
              scope: this,
              parameter: hls_url_path,
              groupLabel: "HLS stream",
              parameterLabel: "Url path for asset delivery (Optional)",
            },
            {
              scope: this,
              parameter: hls_ttl,
              groupLabel: "HLS stream",
              parameterLabel: "TTL for token (Optional)",
            },
          ],
        });


        const hlsHostCondition = new CfnCondition(this, 'HlsHostCondition', { expression: Fn.conditionEquals(hls_hostname, '') });
        const hlsPathCondition = new CfnCondition(this, 'HlsPathCondition', { expression: Fn.conditionEquals(hls_url_path, '') });
        const hlsTtlCondition = new CfnCondition(this, 'hlsTtlCondition', { expression: Fn.conditionEquals(hls_ttl, '') });


        returnObject.hls = {
          hostname: Fn.conditionIf(hlsHostCondition.logicalId, "https://d123.cloudfront.net", hls_hostname.valueAsString).toString(),
          url_path: Fn.conditionIf(hlsPathCondition.logicalId, "/video/1/index.m3u8", hls_url_path.valueAsString).toString(),
          ttl: Fn.conditionIf(hlsTtlCondition.logicalId, "+30m", hls_ttl.valueAsString).toString()
        };
      }
    } else {
      returnObject.hls = {
        hostname: "https://d123.cloudfront.net",
        url_path: "/video/1/index.m3u8",
        ttl: "+30m",
      };
    }

    if (configuration.api) {

      if (configuration.main.rotate_secrets_pattern === "P") {
        returnObject.api = {
          demo: true,
        };
      }else{
        returnObject.api = {
          demo: configuration.api.demo,
        };
      }
     
    }

    returnObject.solutionId = configuration.solutionId;
    returnObject.solutionVersion = configuration.solutionVersion;
    
    this.customInputParameters = returnObject;
  }
}
