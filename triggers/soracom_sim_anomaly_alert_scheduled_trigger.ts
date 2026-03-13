import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimAnomalyAlertWorkflow from "../workflows/soracom_sim_anomaly_alert_workflow.ts";
import {
  ALERT_CHANNEL_ID,
  SCHEDULE_START_TIME,
} from "../lib/soracom/config.ts";

/**
 * SIM異常検知アラート定期実行トリガー
 *
 * 毎時0分にSIM異常検知を実行し、結果をチャンネルに投稿します。
 *
 * 設定用環境変数:
 * - SORACOM_ALERT_CHANNEL_ID: 通知先チャンネルID
 * - SORACOM_DEFAULT_CHANNEL_ID: 共通フォールバック
 * - SORACOM_SCHEDULE_START_TIME: スケジュール開始日時
 */
const SoracomSimAnomalyAlertScheduledTrigger: Trigger<
  typeof SoracomSimAnomalyAlertWorkflow.definition
> = {
  type: TriggerTypes.Scheduled,
  name: "SIM Anomaly Check (Hourly)",
  description: "Automatically check for SIM anomalies every hour",
  workflow:
    `#/workflows/${SoracomSimAnomalyAlertWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: ALERT_CHANNEL_ID,
    },
  },
  schedule: {
    start_time: SCHEDULE_START_TIME,
    frequency: {
      type: "hourly",
      repeats_every: 1,
    },
  },
};

export default SoracomSimAnomalyAlertScheduledTrigger;
