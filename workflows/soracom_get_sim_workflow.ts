import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomGetSimFunctionDefinition } from "../functions/soracom_get_sim/mod.ts";

/**
 * Soracom SIM詳細取得ワークフロー
 *
 * Slackショートカットから起動し、指定したSIMの詳細情報をチャンネルに投稿します。
 */
const SoracomGetSimWorkflow = DefineWorkflow({
  callback_id: "soracom_get_sim_workflow",
  title: "Soracom SIM Details",
  description: "Fetch and display details for a specific Soracom SIM",
  input_parameters: {
    properties: {
      sim_id: {
        type: Schema.types.string,
        description: "Soracom SIM ID (ICCID)",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel",
      },
    },
    required: ["sim_id", "channel_id"],
  },
});

SoracomGetSimWorkflow.addStep(SoracomGetSimFunctionDefinition, {
  sim_id: SoracomGetSimWorkflow.inputs.sim_id,
  channel_id: SoracomGetSimWorkflow.inputs.channel_id,
});

export default SoracomGetSimWorkflow;
