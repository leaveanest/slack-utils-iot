import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimUsageReportWorkflow from "../workflows/soracom_sim_usage_report_workflow.ts";

/**
 * SIM通信量レポートトリガー（ショートカット）
 *
 * 手動でSIM通信量レポートを実行する場合に使用します。
 */
const SoracomSimUsageReportTrigger: Trigger<
  typeof SoracomSimUsageReportWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "SIM Usage Report",
  description: "Generate SIM usage report",
  workflow:
    `#/workflows/${SoracomSimUsageReportWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
    period: {
      value: "day",
      customizable: true,
    },
  },
};

export default SoracomSimUsageReportTrigger;
