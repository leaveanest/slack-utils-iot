import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomGetSimWorkflow from "../workflows/soracom_get_sim_workflow.ts";

/**
 * Soracom SIM詳細取得トリガー
 *
 * ショートカットから起動し、指定したSIMの詳細情報をチャンネルに投稿します。
 * sim_idはトリガー作成時にカスタマイズが必要です。
 */
const SoracomGetSimTrigger: Trigger<
  typeof SoracomGetSimWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Soracom SIM Details",
  description: "Fetch details for a specific Soracom SIM",
  workflow: `#/workflows/${SoracomGetSimWorkflow.definition.callback_id}`,
  inputs: {
    sim_id: {
      value: "",
      customizable: true,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default SoracomGetSimTrigger;
