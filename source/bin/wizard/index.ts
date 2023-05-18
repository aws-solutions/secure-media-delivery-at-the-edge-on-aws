#!/usr/bin/env node
import * as prompts from 'prompts';
import * as fs from 'fs';
import * as path from 'path';

import { IConfiguration } from '../../helpers/validators/configuration';
import { AutoSessionRevocationModule } from './lib/auto-session-revocation-module';
import { PromptComponent } from './lib/prompt-component';
import { onCancel } from './lib/handlers';
import { MainModule } from './lib/main-module';
import { ApiModule } from './lib/api-module';

/**
 * A question prompting for the components to deploy to the sandbox account.
 */
const componentQuestion = {
  type: 'multiselect',
  name: 'value',
  message: 'Which optional module would you like to deploy ?',
  min: 0,
  instructions: false,
  hint: '- Space to select. Return to submit. \'a\' to toggle all.',
  choices: [
    { title: '[API]', 'value': 'b' },
    { title: '[AUTO SESSION REVOCATION]', 'value': 'c' }
  ]
};

/**
 * Prompts the user whether the configuration is valid
 * and should be written.
 */
 const confirmConfigurationQuestion = {
  type: 'confirm',
  name: 'value',
  message: 'Please check your choices before saving the current configuration. Would you like to use it ?'
};

/**
 * A map between component identifiers and their instance.
 */
const moduleMap: { [key: string]: PromptComponent } = {
  'a': new MainModule(),
  'b': new ApiModule(),
  'c': new AutoSessionRevocationModule(),
};


/**
 * Prompts the user for different information and
 * returns the gathered configuration.
 */
const getConfiguration = async (): Promise<IConfiguration> => {
  const configuration: IConfiguration = { 
    "main": {
      "stack_name": "MYSTREAM",
      "rotate_secrets_frequency": "1m",
      "rotate_secrets_pattern": "P",
      "wcu": "100",
      "retention": "5", 
      "metrics": true
    }
  };

  const mainComponent = new Array('a');

  const components: Array<string>     = (await prompts.prompt(componentQuestion, { onCancel })).value;
  const allComponents = mainComponent.concat(components);

  // Iterating over the component prompts.
  for (const item of allComponents) {
    const moduleImpl = moduleMap[item];

    if (moduleImpl) {
      try {
        await moduleImpl.prompt(configuration);
      } catch (e) {
        console.log((e as Error).message);
        process.exit(0);
      }
    }
  }
  configuration.main.metrics = true;
  return (configuration);
};

(async () => {
  const configuration = await getConfiguration();
  
  // The pretty-printed version of the configuration.
  const data = JSON.stringify(configuration, null, 2);
  

  console.log("\n--------------------- Summary -------------------\n")
  // Prompting the user to confirm.
  const confirmation = await prompts.prompt(confirmConfigurationQuestion);

  if (!confirmation.value) {
    console.log(`The configuration has been rejected, exiting.`);
    process.exit(0);
  }

  // The path to the configuration file.
  const filePath = path.resolve(__dirname, '..', '..', '..', 'solution.context.json');

  // Writing the configuration.
  fs.writeFileSync(filePath, data);
  console.log(`\nThe configuration has been successfully written to ${filePath}.\nYou can now deploy the solution by running :\n\nnpx cdk deploy`);
})();