#!/usr/bin/env node
import  { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { getOpts } from "../helpers/opts";

import { SecureMediaStreamingStack, SecureMediaStreamStackProps } from "../lib/secure_media_stream_stack";
import { AutoSessionRevocationStack, AutoSessionRevocationStackProps } from "../lib/auto_revocation_stack";
import { IConfiguration } from "../helpers/validators/configuration";

const app = new App();

const solutionName = 'secure-media-delivery-at-the-edge-on-aws';
const solutionId = app.node.tryGetContext('solution_id');
const solutionDisplayName = app.node.tryGetContext('solution_name');
const solutionVersion = app.node.tryGetContext('solution_version');
const description = `(${solutionId}) - ${solutionDisplayName}. Version ${solutionVersion}`;

export const getMainStackProps = (config: IConfiguration): SecureMediaStreamStackProps => {

  const stackSynthesizer = config.main?.assets_bucket_name ?  
    new DefaultStackSynthesizer(
    {  fileAssetsBucketName: config.main?.assets_bucket_name + "-${AWS::Region}",
        generateBootstrapVersionRule: false
    }
    ) : new DefaultStackSynthesizer()
  

  return {
    description,
    synthesizer: stackSynthesizer,
  };
};

export const getAutoSessionStackProps = (): AutoSessionRevocationStackProps => {

  return {
    description    
  };
};

(async () => {
  // The stack configuration.
  const config = await getOpts();
  config.solutionId = solutionId;
  config.solutionVersion = solutionVersion;
  config.solutionName = solutionName;
  config.solutionDisplayName = solutionDisplayName;
 
  const coreStack = new SecureMediaStreamingStack(
    app,
    config.main.stack_name,
    config,
    getMainStackProps(config)
    
  );

  if (config.sessionRevocation) {
    new AutoSessionRevocationStack( // NOSONAR - typescript:S1848 - false positive for cdk code
      app,
      config.main.stack_name + "AutoSessionRevocation",
      config,
      coreStack.sessionToRevoke,
      getAutoSessionStackProps()
    );
  }
})();
