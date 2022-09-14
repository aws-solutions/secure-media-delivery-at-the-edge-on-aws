#!/usr/bin/env node
import  { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { getOpts } from "../helpers/opts";

import { SecureMediaStreamingStack, SecureMediaStreamStackProps } from "../lib/secure_media_stream_stack";
import { AutoSessionRevocationStack, AutoSessionRevocationStackProps } from "../lib/auto_revocation_stack";
import { IConfiguration } from "../helpers/validators/configuration";

const solutionId = 'SO0195';
const solutionDisplayName = 'Secure Media Delivery at the Edge';
const solutionVersion = '1.0.1';
const description = `(${solutionId}) - ${solutionDisplayName}. Version ${solutionVersion}`;

const app = new App();
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
 
  const coreStack = new SecureMediaStreamingStack(
    app,
    config.main.stack_name,
    config,
    getMainStackProps(config)
    
  );

  if (config.sessionRevocation) {
    new AutoSessionRevocationStack(
      app,
      config.main.stack_name + "AutoSessionRevocation",
      config,
      coreStack.sessionToRevoke,
      getAutoSessionStackProps()
    );
  }
})();
