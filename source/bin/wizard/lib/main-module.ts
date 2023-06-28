import * as Joi from "joi";
import * as prompts from "prompts";

import { PromptComponent } from "./prompt-component";
import { onCancel } from "./handlers";
import { IConfiguration } from "../../../helpers/validators/configuration";
import { IMain } from "../../../helpers/validators/main";

const coreQuestions = [
  {
    type: "text",
    name: "stack_name",
    message: "[Base module] --> Stack name",
    validate: (value: string) =>
        !/^[A-Za-z][A-Za-z0-9-]*$/.test(value)
        ? "The name of the stack is mandatory and can include letters (A-Z and a-z), numbers (0-9), and dashes (-)."
        : true,
  },
  {
    type: "text",
    name: "wcu",
    message:
      "[Base module] --> Set the capacity limit expressed in WCUs for WAF Rule Group to keep the session list that should be blocked (between 2 and 1500)",
    validate: (value: string) =>
        Joi.number().min(2).required().validate(value).error || Joi.number().max(1500).required().validate(value).error
        ? "Capacity is mandatory and must be a number between 2 and 1500"
        : true,
  },
  {
    type: "text",
    name: "retention",
    message:
      "[Base module] --> Set the retention time for compromised sessions (in minutes)",
    validate: (value: number) =>
      Joi.number().min(1).required().validate(value).error
        ? "Retention is mandatory and must be a number higher than 1"
        : true,
  },

  {
    type: "select",
    name: "rotate_secrets_frequency",
    message:
      "[Base module] --> At what frequency do you want to rotate the secrets?",
    choices: [
      { title: "Manual", value: "m" },
      { title: "Every day", value: "24h" },
      { title: "Every week", value: "1w" },
      { title: "Monthly", value: "1m" },
    ],
    initial: 1,
  },
];
const rotation_day_of_the_week_question = [
  {
    type: "select",
    name: "value",
    message:
      "[Base module] --> On which day of the week you would like to trigger it",
    choices: [
      { title: "Monday", value: "2" },
      { title: "Tuesday", value: "3" },
      { title: "Wednesday", value: "4" },
      { title: "Thursday", value: "5" },
      { title: "Friday", value: "6" },
      { title: "Saturday", value: "7" },
      { title: "Sunday", value: "1" },
    ],
    initial: 1,
  },
];

const rotation_week_of_month_question = [
  {
    type: "select",
    name: "value",
    message:
      "[Base module] --> On which week of the month you would like to trigger it",
    choices: [
      { title: "Week 1", value: "1" },
      { title: "Week 2", value: "2" },
      { title: "Week 3", value: "3" },
      { title: "Week 4", value: "4" },
    ],
    initial: 1,
  },
];

const rotation_datetime_question = [
  {
    type: "text",
    name: "value",
    message:
      "[Base module] --> At what time of the day should take place (use the format HH:mm, events use UTC+0 time zone) ",
    validate: (value: string) =>
      Joi.string()
        .regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/)
        .validate(value).error
        ? "The expected format is HH:mm"
        : true,
  },
];

export class MainModule implements PromptComponent {
  /**
   * Implements the logic to prompt questions to the user
   * and to fill the given configuration with the provided responses.
   * @param configuration an object in which the configuration must be stored.
   */
  async prompt(configuration: IConfiguration): Promise<IConfiguration> {
    console.log(
      "\n--------------------- Base configuration -------------------\n"
    );
    configuration.main = <IMain>(
      await prompts.prompt(coreQuestions, { onCancel })
    );

    if (configuration.main.rotate_secrets_frequency !== "m") {
      //Minutes	Hours	Day_of_month	Month	Day_of_week	Year
      //MIN HOUR * * DAY *
      let day_of_the_week = "*";
      const day_of_the_month = "?";

      if (configuration.main.rotate_secrets_frequency === "1w") {
        const day = await prompts.prompt(rotation_day_of_the_week_question, {
          onCancel,
        });
        day_of_the_week = day.value;
      } else if (configuration.main.rotate_secrets_frequency === "1m") {
        //1m
        const answer_day_week = await prompts.prompt(
          rotation_day_of_the_week_question,
          { onCancel }
        );
        const answer_week_month = await prompts.prompt(
          rotation_week_of_month_question,
          { onCancel }
        );

        day_of_the_week = answer_day_week.value + "#" + answer_week_month.value;
      }

      const answer_datetime = await prompts.prompt(rotation_datetime_question, {
        onCancel,
      });
      const datetime = answer_datetime.value.split(":");
      configuration.main.rotate_secrets_pattern =
        datetime[1] +
        " " +
        datetime[0] +
        " " +
        day_of_the_month +
        " * " +
        day_of_the_week +
        " *";
    }

    return configuration;
  }
}
