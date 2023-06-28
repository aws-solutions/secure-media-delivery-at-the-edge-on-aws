/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { custom_resources } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
import * as fs from "fs";
import { IConfiguration } from "../../helpers/validators/configuration";

export interface IConfigProps {
  table: ITable;
  configuration: IConfiguration;
}

export class CrLoadAssetsTable extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    new custom_resources.AwsCustomResource(this, "initDBResource", { // NOSONAR
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [props.table.tableName]: this.loadItems(props.configuration),
          },
        },
        physicalResourceId:
          custom_resources.PhysicalResourceId.of("initDBData"),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [props.table.tableArn],
      })
    });
  }

  private loadItems = (configuration: IConfiguration) => {
    let fileContent = fs.readFileSync("resources/mock/assets.json").toString();
    let itemsToInsert = new Array();
    if (configuration.hls) {
      const urlPath = configuration.hls?.url_path;
      const path = urlPath.substring(0, urlPath.lastIndexOf("/")) + "/";

      let hlsFileContent = fileContent.replace(
        "CUSTOM_HOST_NAME",
        configuration.hls?.hostname
      );
      hlsFileContent = hlsFileContent.replace(
        "CUSTOM_URL_PATH",
        configuration.hls?.url_path
      );
      hlsFileContent = hlsFileContent.replace(
        "CUSTOM_TTL",
        configuration.hls?.ttl
      );
      hlsFileContent = hlsFileContent.replace("CUSTOM_ID", "1");
      hlsFileContent = hlsFileContent.replace("CUSTOM_PATH", path);
      itemsToInsert.push({ PutRequest: { Item: JSON.parse(hlsFileContent) } });
    }

    if (configuration.dash) {
      const urlPath = configuration.dash?.url_path;
      const path = urlPath.substring(0, urlPath.lastIndexOf("/")) + "/";
      let dashFileContent = fileContent.replace(
        "CUSTOM_HOST_NAME",
        configuration.dash?.hostname
      );
      dashFileContent = dashFileContent.replace(
        "CUSTOM_URL_PATH",
        configuration.dash?.url_path
      );
      dashFileContent = dashFileContent.replace(
        "CUSTOM_TTL",
        configuration.dash?.ttl
      );
      dashFileContent = dashFileContent.replace("CUSTOM_ID", "2");
      dashFileContent = dashFileContent.replace("CUSTOM_PATH", path);

      itemsToInsert.push({ PutRequest: { Item: JSON.parse(dashFileContent) } });
    }

    if (itemsToInsert.length == 0) {
      //DASH or HLS not configured
      fileContent = fileContent.replace("ID", "1");
      itemsToInsert.push({ PutRequest: { Item: JSON.parse(fileContent) } });
    }

    return itemsToInsert;
  };
}
