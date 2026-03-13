import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomGetAirUsageWorkflow from "../workflows/soracom_get_air_usage_workflow.ts";

/**
 * Soracom Air通信量統計取得トリガー
 *
 * ショートカットから起動し、指定したサブスクライバーの通信量統計をチャンネルに投稿します。
 * imsiとperiodはトリガー作成時にカスタマイズが必要です。
 */
const SoracomGetAirUsageTrigger: Trigger<
  typeof SoracomGetAirUsageWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Soracom Air Usage Stats",
  description: "Fetch air usage statistics for a SIM subscriber",
  workflow:
    `#/workflows/${SoracomGetAirUsageWorkflow.definition.callback_id}`,
  inputs: {
    imsi: {
      value: "",
      customizable: true,
    },
    period: {
      value: "day",
      customizable: true,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default SoracomGetAirUsageTrigger;
