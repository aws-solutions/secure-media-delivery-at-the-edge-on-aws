// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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