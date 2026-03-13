import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomListSimsFunctionDefinition } from "../functions/soracom_list_sims/mod.ts";

/**
 * Soracom SIM一覧取得ワークフロー
 *
 * Slackショートカットから起動し、SoracomのSIM一覧をチャンネルに投稿します。
 */
const SoracomListSimsWorkflow = DefineWorkflow({
  callback_id: "soracom_list_sims_workflow",
  title: "Soracom SIM List",
  description: "Fetch and display Soracom SIM list in the channel",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel",
      },
    },
    required: ["channel_id"],
  },
});

SoracomListSimsWorkflow.addStep(SoracomListSimsFunctionDefinition, {
  channel_id: SoracomListSimsWorkflow.inputs.channel_id,
});

export default SoracomListSimsWorkflow;
