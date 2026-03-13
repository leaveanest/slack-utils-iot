import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomGetAirUsageFunctionDefinition } from "../functions/soracom_get_air_usage/mod.ts";

/**
 * Soracom Air通信量統計取得ワークフロー
 *
 * Slackショートカットから起動し、指定したサブスクライバーの通信量統計をチャンネルに投稿します。
 */
const SoracomGetAirUsageWorkflow = DefineWorkflow({
  callback_id: "soracom_get_air_usage_workflow",
  title: "Soracom Air Usage Stats",
  description: "Fetch and display air usage statistics for a SIM subscriber",
  input_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "IMSI of the subscriber (15 digits)",
      },
      period: {
        type: Schema.types.string,
        description: "Aggregation period: 'day' or 'month'",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel",
      },
    },
    required: ["imsi", "period", "channel_id"],
  },
});

SoracomGetAirUsageWorkflow.addStep(SoracomGetAirUsageFunctionDefinition, {
  imsi: SoracomGetAirUsageWorkflow.inputs.imsi,
  period: SoracomGetAirUsageWorkflow.inputs.period,
  channel_id: SoracomGetAirUsageWorkflow.inputs.channel_id,
});

export default SoracomGetAirUsageWorkflow;
