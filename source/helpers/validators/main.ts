import * as Joi from 'joi';

/**
 * A description of the Core configuration
 * in Typescript.
 */
export interface IMain {

  /**
   * The limit (in dollars) at which a notification is
   * to be sent when the actual budget is superior
   * to the limit value.
   */
   stack_name: string;
   assets_bucket_name?: string;
   rotate_secrets_frequency: string;
   rotate_secrets_pattern: string;
   wcu: string;
   retention: string;
   metrics: boolean;

}

/**
 * The `Joi` schema for validating the core configuration.
 */
export const coreSchema = Joi.object().keys({
  stack_name:Joi.string().required(),
  assets_bucket_name:Joi.string().optional(),
  rotate_secrets_frequency: Joi.string().required(),
  rotate_secrets_pattern: Joi.string().optional(),
  wcu:Joi.string().required(),
  retention:Joi.string().required(),
  metrics: Joi.boolean().optional(),
});