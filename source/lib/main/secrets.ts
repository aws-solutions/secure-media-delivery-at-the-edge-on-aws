// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Aws,
  CfnOutput,
  aws_secretsmanager as secretsmanager
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { addCfnSuppressRules } from "../cfn_nag/cfn_nag_utils";

export class Secrets extends Construct {
  public readonly primarySecret: secretsmanager.ISecret;
  public readonly secondarySecret: secretsmanager.ISecret;
  public readonly temporarySecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const primarySecret = new secretsmanager.Secret(this, "Primary", {
      secretName: Aws.STACK_NAME + "_PrimarySecret",
      description: "Primary secret for Secure Media Delivery at the Edge on AWS",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ MY_PRIMARY_KEY: "" }),
        generateStringKey: "MY_PRIMARY_KEY",
      },
    });

    addCfnSuppressRules(primarySecret, [{ id: 'W77', reason: 'By default CDK provisions this secret using a default encryption key sourced from AWS Key Management Service. We are satisfied with default KMS encryption on secrets.' }]);


    const secondarySecret = new secretsmanager.Secret(this, "Secondary", {
      secretName: Aws.STACK_NAME + "_SecondarySecret",
      description: "Secondary secret for Secure Media Delivery at the Edge on AWS",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ MY_SECONDARY_KEY: "" }),
        generateStringKey: "MY_SECONDARY_KEY",
      },
    });

    addCfnSuppressRules(secondarySecret, [{ id: 'W77', reason: 'By default CDK provisions this secret using a default encryption key sourced from AWS Key Management Service. We are satisfied with default KMS encryption on secrets.' }]);


    const temporarySecret = new secretsmanager.Secret(this, "Temporary", {
      secretName: Aws.STACK_NAME + "_TemporarySecret",
      description: "Temporary secret for Secure Media Delivery at the Edge on AWS",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ MY_TEMPORARY_KEY: "" }),
        generateStringKey: "MY_TEMPORARY_KEY",
      },
    });

    addCfnSuppressRules(temporarySecret, [{ id: 'W77', reason: 'By default CDK provisions this secret using a default encryption key sourced from AWS Key Management Service. We are satisfied with default KMS encryption on secrets.' }]);

    this.primarySecret = primarySecret;
    this.secondarySecret = secondarySecret;
    this.temporarySecret = temporarySecret;

    new CfnOutput(this, "PrimarySecret", { // NOSONAR
      value: primarySecret.secretName,
      description: "The name of the PrimarySecret",
    });

    new CfnOutput(this, "SecondarySecret", { // NOSONAR
      value: secondarySecret.secretName,
      description: "The name of the SecondarySecret",
    });
  }
}
