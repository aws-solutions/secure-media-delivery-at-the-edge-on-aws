// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as Joi from 'joi';

/**
 * A description of the Api configuration
 * in Typescript.
 */
export interface IApi {

  /**
   * The limit (in dollars) at which a notification is
   * to be sent when the actual budget is superior
   * to the limit value.
   */
   demo: boolean;
}

/**
 * The `Joi` schema for validating the api configuration.
 */
export const apiSchema = Joi.object().keys({
  demo: Joi.boolean().required(),

});