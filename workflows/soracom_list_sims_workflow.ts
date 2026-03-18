import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomListSimsFunctionDefinition } from "../functions/soracom_list_sims/mod.ts";

/**
 * Soracom SIM一覧取得ワークフロー
 *
 * Slackショートカットから起動し、SoracomのSIM一覧をチャンネルに投稿します。
 */
const SoracomListSimsWorkflow = DefineWorkflow({
  callback_id: "soracom_list_sims_workflow",
  title: "SORACOM SIM一覧",
  description: "SORACOM の SIM 一覧を取得して表示します",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "対象チャンネル",
      },
    },
    required: ["channel_id"],
  },
});

SoracomListSimsWorkflow.addStep(SoracomListSimsFunctionDefinition, {
  channel_id: SoracomListSimsWorkflow.inputs.channel_id,
});

export default SoracomListSimsWorkflow;
