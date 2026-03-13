import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomSimUsageReportFunctionDefinition } from "../functions/soracom_sim_usage_report/mod.ts";

/**
 * SIM通信量サマリーレポートワークフロー
 *
 * 全SIMの通信量統計を取得し、サマリーレポートをチャンネルに投稿します。
 * Scheduled Triggerで週次/月次実行することを推奨します。
 */
const SoracomSimUsageReportWorkflow = DefineWorkflow({
  callback_id: "soracom_sim_usage_report_workflow",
  title: "Soracom SIM Usage Report",
  description: "Generate a usage report for all SIMs",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel for reports",
      },
      period: {
        type: Schema.types.string,
        description: "Report period: 'day' or 'month'",
      },
    },
    required: ["channel_id", "period"],
  },
});

SoracomSimUsageReportWorkflow.addStep(
  SoracomSimUsageReportFunctionDefinition,
  {
    channel_id: SoracomSimUsageReportWorkflow.inputs.channel_id,
    period: SoracomSimUsageReportWorkflow.inputs.period,
  },
);

export default SoracomSimUsageReportWorkflow;
