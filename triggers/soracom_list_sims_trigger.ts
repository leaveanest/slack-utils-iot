import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomListSimsWorkflow from "../workflows/soracom_list_sims_workflow.ts";

/**
 * Soracom SIM一覧取得トリガー
 *
 * ショートカットから起動し、SIM一覧をチャンネルに投稿します。
 */
const SoracomListSimsTrigger: Trigger<
  typeof SoracomListSimsWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Soracom SIM List",
  description: "Fetch Soracom SIM list",
  workflow: `#/workflows/${SoracomListSimsWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default SoracomListSimsTrigger;
