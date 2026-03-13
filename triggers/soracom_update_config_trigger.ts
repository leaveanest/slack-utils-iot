import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomUpdateConfigWorkflow from "../workflows/soracom_update_config_workflow.ts";

/**
 * Soracom設定更新トリガー（ショートカット）
 *
 * Slack上から設定値を更新するためのショートカットトリガーです。
 * config_keyとconfig_valueはワークフロー実行時に入力します。
 */
const SoracomUpdateConfigTrigger: Trigger<
  typeof SoracomUpdateConfigWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Soracom Config Update",
  description: "Update Soracom configuration values",
  workflow:
    `#/workflows/${SoracomUpdateConfigWorkflow.definition.callback_id}`,
  inputs: {
    config_key: {
      value: "",
    },
    config_value: {
      value: "",
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default SoracomUpdateConfigTrigger;
