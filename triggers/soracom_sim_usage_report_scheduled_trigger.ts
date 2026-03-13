import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimUsageReportWorkflow from "../workflows/soracom_sim_usage_report_workflow.ts";
import {
  REPORT_CHANNEL_ID,
  SCHEDULE_START_TIME,
} from "../lib/soracom/config.ts";

/**
 * SIM通信量レポート定期実行トリガー
 *
 * 毎週月曜日の9:00 JSTに月次レポートを配信します。
 *
 * 設定用環境変数:
 * - SORACOM_REPORT_CHANNEL_ID: レポート投稿先チャンネルID
 * - SORACOM_DEFAULT_CHANNEL_ID: 共通フォールバック
 * - SORACOM_SCHEDULE_START_TIME: スケジュール開始日時
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
      value: REPORT_CHANNEL_ID,
    },
    period: {
      value: "month",
    },
  },
  schedule: {
    start_time: SCHEDULE_START_TIME,
    frequency: {
      type: "weekly",
      repeats_every: 1,
      on_days: ["Monday"],
    },
  },
};

export default SoracomSimUsageReportScheduledTrigger;
