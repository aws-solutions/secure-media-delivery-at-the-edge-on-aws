// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { custom_resources } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
import { IConfiguration } from "../../helpers/validators/configuration";

export interface IConfigProps {
  table: ITable;
  configuration: IConfiguration;
}

export class CrLoadSqlParams extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    new custom_resources.AwsCustomResource(this, "initDBResource", { // NOSONAR
      onCreate: {
        service: "DynamoDB",
        action: "putItem",
        parameters: {
          TableName: props.table.tableName,
          Item: this.loadItems(props),
        },
        physicalResourceId:
          custom_resources.PhysicalResourceId.of("loadSqlParams"),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [props.table.tableArn],
      })
    });


  }



  private loadItems = (props: IConfigProps) => {
    return {
      trigger_workflow_frequency: {
        N: props.configuration.sessionRevocation?.trigger_workflow_frequency.toString(),
      },
      db_name: { S: props.configuration.sessionRevocation?.db_name },
      table_name: { S: props.configuration.sessionRevocation?.table_name },
      request_ip_column: {
        S: props.configuration.sessionRevocation?.request_ip_column,
      },
      ua_column_name: {
        S: props.configuration.sessionRevocation?.ua_column_name,
      },
      referer_column_name: {
        S: props.configuration.sessionRevocation?.referer_column_name,
      },
      uri_column_name: {
        S: props.configuration.sessionRevocation?.uri_column_name,
      },
      status_column_name: {
        S: props.configuration.sessionRevocation?.status_column_name,
      },
      response_bytes_column_name: {
        S: props.configuration.sessionRevocation?.response_bytes_column_name,
      },
      date_column_name: {
        S: props.configuration.sessionRevocation?.date_column_name,
      },
      time_column_name: {
        S: props.configuration.sessionRevocation?.time_column_name,
      },
      lookback_period: {
        N: props.configuration.sessionRevocation?.lookback_period.toString(),
      },
      ip_penalty: {
        N: props.configuration.sessionRevocation?.ip_rate.toString(),
      },
      ip_rate: {
        N: props.configuration.sessionRevocation?.ip_penalty.toString(),
      },
      referer_penalty: {
        N: props.configuration.sessionRevocation?.referer_penalty.toString(),
      },
      ua_penalty: {
        N: props.configuration.sessionRevocation?.ua_penalty.toString(),
      },
      min_sessions_number: {
        N: props.configuration.sessionRevocation?.min_sessions_number.toString(),
      },
      min_session_duration: {
        N: props.configuration.sessionRevocation?.min_session_duration.toString(),
      },
      score_threshold: {
        N: props.configuration.sessionRevocation?.score_threshold.toString(),
      },
      partitioned: {
        N: props.configuration.sessionRevocation?.partitioned.toString(),
      },
    };
  };
}
