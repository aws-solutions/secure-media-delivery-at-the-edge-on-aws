import * as Joi from 'joi';

/**
 * A description of the Session Invalidation configuration
 * in Typescript.
 */
export interface ISessionRevocation {

  /**
   * The limit (in dollars) at which a notification is
   * to be sent when the actual budget is superior
   * to the limit value.
   */
    trigger_workflow_frequency: number ;
    db_name: string;
    table_name: string;
    request_ip_column: string;
    ua_column_name: string;
    referer_column_name: string;
    uri_column_name: string;
    status_column_name: string;
    response_bytes_column_name: string;
    date_column_name: string;
    time_column_name: string;
    lookback_period: number;
    ip_penalty: number;
    ip_rate: number;
    referer_penalty: number;
    ua_penalty: number;
    min_sessions_number: number;
    min_session_duration: number;
    score_threshold: number;
    partitioned: number;
}

/**
 * The `Joi` schema for validating the session invalidation configuration.
 */
export const sessionRevocationSchema = Joi.object().keys({
    trigger_workflow_frequency: Joi.number().required(),
    db_name: Joi.string().required(),
    table_name: Joi.string().required(),
    request_ip_column: Joi.string().required(),
    ua_column_name: Joi.string().required(),
    referer_column_name: Joi.string().required(),
    uri_column_name: Joi.string().required(),
    status_column_name: Joi.string().required(),
    response_bytes_column_name: Joi.string().required(),
    date_column_name: Joi.string().required(),
    time_column_name: Joi.string().required(),
    lookback_period: Joi.number().required(),
    ip_penalty: Joi.number().required(),
    ip_rate: Joi.number().required(),
    referer_penalty: Joi.number().required(),
    ua_penalty: Joi.number().required(),
    min_sessions_number: Joi.number().required(),
    min_session_duration: Joi.number().required(),
    score_threshold: Joi.number().required(),
    partitioned: Joi.number().required(),

});