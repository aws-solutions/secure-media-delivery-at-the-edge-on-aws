import * as Joi from "joi";
import * as prompts from "prompts";

import { PromptComponent } from "./prompt-component";
import { onCancel } from "./handlers";
import { IConfiguration } from "../../../helpers/validators/configuration";
import { ISessionRevocation } from "../../../helpers/validators/auto_session_revocation";

/**
 * A question prompting the user for the session invalidation
 * to allocate to a prototype.
 */
const sessionRevocationQuestions = [
  {
    type: "number",
    name: "trigger_workflow_frequency",
    message:
      "[AUTO SESSION REVOCATION] --> At what frequency do you want to trigger the workflow to detect session to invalidate?\n (in minutes between 1 and 15, type 0 for MANUAL trigger) ",
    validate: (value: number) =>
      Joi.number().min(0).required().validate(value).error &&
      Joi.number().max(15).required().validate(value).error
        ? "The value must be a number superior or equal to 0 and lower or equal to 15"
        : true,
  },
  {
    type: "text",
    name: "db_name",
    message: "\nMapping of Athena table attributes\n\n [AUTO SESSION REVOCATION] --> Athena Database name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "The name of the Database is mandatory"
        : true,
  },
  {
    type: "text",
    name: "table_name",
    message: "[AUTO SESSION REVOCATION] --> Athena Table name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Table name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "request_ip_column",
    message: "[AUTO SESSION REVOCATION] --> Request IP column",
    initial: "request_ip",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Request IP column is mandatory"
        : true,
  },
  {
    type: "text",
    name: "ua_column_name",
    initial: "user_agent",
    message: "[AUTO SESSION REVOCATION] --> UA column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "UA column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "referer_column_name",
    initial: "referrer",
    message: "[AUTO SESSION REVOCATION] --> Referer column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Referer column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "uri_column_name",
    initial: "uri",
    message: "[AUTO SESSION REVOCATION] --> URI column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "URI column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "status_column_name",
    initial: "status",
    message: "[AUTO SESSION REVOCATION] --> Status column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Status column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "response_bytes_column_name",
    initial: "bytes",
    message: "[AUTO SESSION REVOCATION] --> Response bytes column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Response bytes column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "date_column_name",
    initial: "date",
    message: "[AUTO SESSION REVOCATION] --> Date column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Date column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "time_column_name",
    initial: "time",
    message: "[AUTO SESSION REVOCATION] --> Time column name",
    validate: (value: string) =>
      Joi.string().required().validate(value).error
        ? "Time column name is mandatory"
        : true,
  },
  {
    type: "text",
    name: "lookback_period",
    initial: 10,
    message: "\nAuto Revocation input parameters\n\n[AUTO SESSION REVOCATION] --> Lookback period",
    validate: (value: number) =>
      Joi.number().required().validate(value).error
        ? "Lookback period is mandatory"
        : true,
  },
  {
    type: "select",
    name: "ip_penalty",
    message: "[AUTO SESSION REVOCATION] --> IP penalty",
    choices: [
      { title: "true", value: 1 },
      { title: "false", value: 0 },
    ],
  },
  {
    type: "select",
    name: "ip_rate",
    message: "[AUTO SESSION REVOCATION] --> IP rate",
    choices: [
      { title: "true", value: 1 },
      { title: "false", value: 0 },
    ],
  },
  {
    type: "select",
    name: "referer_penalty",
    message: "[AUTO SESSION REVOCATION] --> Referer penalty",
    choices: [
      { title: "true", value: 1 },
      { title: "false", value: 0 },
    ],
  },
  {
    type: "select",
    name: "ua_penalty",
    message: "[AUTO SESSION REVOCATION] --> Multiple User-Agent penalty",
    choices: [
      { title: "true", value: 1 },
      { title: "false", value: 0 },
    ],
  },
  {
    type: "text",
    name: "min_sessions_number",
    message: "[AUTO SESSION REVOCATION] --> Minimum sessions number",
    initial: 3,
    validate: (value: number) =>
      Joi.number().required().validate(value).error
        ? "Minimum sessions number is mandatory"
        : true,
  },
  {
    type: "text",
    name: "min_session_duration",
    initial: 30,
    message: "[AUTO SESSION REVOCATION] --> Minimum session duration threshold (in seconds)",
    validate: (value: number) =>
      Joi.number().required().validate(value).error
        ? "Minimum sessions duration is mandatory"
        : true,
  },
  {
    type: "text",
    name: "score_threshold",
    initial: 2.2,
    message: "[AUTO SESSION REVOCATION] --> Score threshold",
    validate: (value: number) =>
      Joi.number().required().validate(value).error
        ? "Score threshold is mandatory"
        : true,
  },
  {
    type: "select",
    name: "partitioned",
    message: "[AUTO SESSION REVOCATION] --> Are your access logs partitioned",
    choices: [
      { title: "false", value: 0 },
      { title: "true", value: 1 },
    ],
    intial: 1,
  },
];

export class AutoSessionRevocationModule implements PromptComponent {
  /**
   * Implements the logic to prompt questions to the user
   * and to fill the given configuration with the provided responses.
   * @param configuration an object in which the configuration must be stored.
   */
  async prompt(configuration: IConfiguration): Promise<IConfiguration> {
    console.log(
      "\n--------------------- SESSION REVOCATION Module -------------------\n"
    );
    configuration.sessionRevocation = <ISessionRevocation>(
      await prompts.prompt(sessionRevocationQuestions, { onCancel })
    );
    return configuration;
  }
}
