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

import { custom_resources, aws_iam as iam } from "aws-cdk-lib";

import { Construct } from "constructs";

export interface IConfigProps {
  functionArn: string;
  functionName: string;
}

export class CrInitSecrets extends Construct {
  constructor(scope: Construct, id: string, props: IConfigProps) {
    super(scope, id);

    new custom_resources.AwsCustomResource(this, "rotateSecrets", {
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
