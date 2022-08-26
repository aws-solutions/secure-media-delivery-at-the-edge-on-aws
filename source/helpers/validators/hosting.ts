import * as Joi from 'joi';


export interface IHosting {

  hostname: string;
  url_path: string;
  ttl: string;

}

/**
 * The `Joi` schema for validating the api configuration.
 */
export const hostingSchema = Joi.object().keys({
  url_path: Joi.string().required(),
  ttl: Joi.string().required(),
  hostname: Joi.string().required(),
});