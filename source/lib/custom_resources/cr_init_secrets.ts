// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { custom_resources, aws_iam as iam } from "aws-cdk-lib";

import { Construct } from "constructs";

export interface IConfigProps {
  functionArn: string;
  functionName: string;
}

export class CrInitSecrets extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    new custom_resources.AwsCustomResource(this, "rotateSecrets", { // NOSONAR
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: props.functionName,
          Payload: `{"initialize": true}`,
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(
          "initSecretsResourceId"
        ),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [props.functionArn],
        }),
      ])
    });
  }
}
