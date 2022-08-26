import { schema, IConfiguration }  from './validators/configuration';

/**
 * A reference to the configuration file.
 */
let config = null;

/**
 * This function will validate the configuration read from the CDK context
 * file, and will pass the resulted value to the caller.
 * @throws an exception if the configuration is not valid.
 */
export const getOpts = async (): Promise<IConfiguration> => {

  try {
    config = require('../solution.context.json');
  } catch (e) {

    console.error(e);
    console.error(`
      The 'solution.context.json' configuration file could not be found.
      Please run 'npm run wizard' to generate a configuration before deploying.
    `);
    process.exit(1);
  }

  // Validating the project configuration.
  const result = schema.validate(config);

  // Verifying whether the configuration is valid.
  if (result.error) {
    throw new Error(result.error.message);
  }
  // Returning validated options.
  return (result.value);
};
