import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimUsageReportWorkflow from "../workflows/soracom_sim_usage_report_workflow.ts";

/**
 * SIM通信量レポート定期実行トリガー
 *
 * 毎週月曜日の9:00 JSTに月次レポートを配信します。
 * channel_idは利用環境に合わせて変更してください。
 */
const SoracomSimUsageReportScheduledTrigger: Trigger<
  typeof SoracomSimUsageReportWorkflow.definition
> = {
  type: TriggerTypes.Scheduled,
  name: "SIM Usage Report (Weekly)",
  description: "Automatically generate SIM usage report every week",
  workflow:
    `#/workflows/${SoracomSimUsageReportWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: "C0000000000", // デプロイ時に実際のチャンネルIDに変更
    },
    period: {
      value: "month",
    },
  },
  schedule: {
    start_time: "2026-01-05T00:00:00Z", // 月曜日 9:00 JST
    frequency: {
      type: "weekly",
      repeats_every: 1,
      on_days: ["Monday"],
    },
  },
};

export default SoracomSimUsageReportScheduledTrigger;
