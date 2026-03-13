import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomUpdateConfigFunctionDefinition } from "../functions/soracom_update_config/mod.ts";

/**
 * Soracom設定更新ワークフロー
 *
 * Datastoreの設定値を更新するワークフローです。
 * ショートカットトリガーから実行できます。
 */
const SoracomUpdateConfigWorkflow = DefineWorkflow({
  callback_id: "soracom_update_config_workflow",
  title: "Soracom Update Config",
  description: "Update Soracom configuration values in the datastore",
  input_parameters: {
    properties: {
      config_key: {
        type: Schema.types.string,
        description: "Configuration key",
      },
      config_value: {
        type: Schema.types.string,
        description: "Configuration value",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel to post confirmation",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User who triggered the update",
      },
    },
    required: ["config_key", "config_value", "channel_id", "user_id"],
  },
});

SoracomUpdateConfigWorkflow.addStep(
  SoracomUpdateConfigFunctionDefinition,
  {
    config_key: SoracomUpdateConfigWorkflow.inputs.config_key,
    config_value: SoracomUpdateConfigWorkflow.inputs.config_value,
    channel_id: SoracomUpdateConfigWorkflow.inputs.channel_id,
    user_id: SoracomUpdateConfigWorkflow.inputs.user_id,
  },
);

export default SoracomUpdateConfigWorkflow;
