import * as prompts from "prompts";
import * as Joi from "joi";
import { PromptComponent } from "./prompt-component";
import { onCancel } from "./handlers";
import { IConfiguration } from "../../../helpers/validators/configuration";
import { IApi } from "../../../helpers/validators/api";
import { IHosting } from "../../../helpers/validators/hosting";

/**
 * A question prompting the user for the session invalidation
 * to allocate to a prototype.
 */
const apiQuestions = [
  {
    type: "toggle",
    name: "demo",
    message: "[API] --> Do you want to deploy a demo website?",
    choices: [
      { title: "Yes", value: true },
      { title: "Python", value: false },
    ],
    initial: 1,
  },
];

const selectAssetHosting = [
  {
    type: "toggle",
    name: "hosting",
    message:
      "[API] --> Do you want to configure your existing hosting used for asset delivery?",
    initial: true,
    active: "yes",
    inactive: "no",
  },
];

const selectVideoStreamType = [
  {
    type: "multiselect",
    name: "value",
    message: "[API] --> Which video stream type would you like to configure?",
    min: 1,
    instructions: false,
    hint: "- Space to select. Return to submit. 'a' to toggle all.",
    choices: [
      { title: "HLS", value: "hls" },
      { title: "DASH", value: "dash" },
    ],
  },
];

function hostQuestions(type: string) {
  return [
    {
      type: "text",
      name: "hostname",
      message: "[API][" + type + "] --> Hostname used for asset delivery",
      validate: (value: string) =>
        Joi.string().required().validate(value).error
          ? "Hostname is mandatory"
          : true,
    },
    {
      type: "text",
      name: "url_path",
      message: "[API][" + type + "] --> URL path for existing playable asset",
      validate: (value: string) =>
        Joi.string().required().validate(value).error
          ? "URL path for existing playable asset is mandatory"
          : true,
    },
    {
      type: "select",
      name: "ttl",
      message: "[API][" + type + "] --> TTL for the token",
      choices: [
        { title: "30 minutes", value: "+30m" },
        { title: "One hour", value: "+1h" },
        { title: "3 hours", value: "+3h" },
        { title: "6 hours", value: "+6h" },
        { title: "24 hours", value: "+24h" },
      ],
      initial: 1,
    },
  ];
}

export class ApiModule implements PromptComponent {
  /**
   * Implements the logic to prompt questions to the user
   * and to fill the given configuration with the provided responses.
   * @param configuration an object in which the configuration must be stored.
   */
  async prompt(configuration: IConfiguration): Promise<IConfiguration> {
    console.log("\n--------------------- API Module -------------------\n");
    configuration.api = <IApi>await prompts.prompt(apiQuestions, { onCancel });

    const configureHosting = await prompts.prompt(selectAssetHosting, {
      onCancel,
    });

    if (configureHosting.hosting) {
      const streamType = await prompts.prompt(selectVideoStreamType, {
        onCancel,
      });

      if (streamType.value.includes("hls")) {
        configuration.hls = <IHosting>(
          await prompts.prompt(hostQuestions("HLS"), { onCancel })
        );
      }

      if (streamType.value.includes("dash")) {
        configuration.dash = <IHosting>(
          await prompts.prompt(hostQuestions("DASH"), { onCancel })
        );
      }
    }

    return configuration;
  }
}
