import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimAnomalyAlertWorkflow from "../workflows/soracom_sim_anomaly_alert_workflow.ts";

/**
 * SIM異常検知アラート定期実行トリガー
 *
 * 毎時0分にSIM異常検知を実行し、結果をチャンネルに投稿します。
 * channel_idは利用環境に合わせて変更してください。
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
      value: "C0000000000", // デプロイ時に実際のチャンネルIDに変更
    },
  },
  schedule: {
    start_time: "2026-01-01T00:00:00Z",
    frequency: {
      type: "hourly",
      repeats_every: 1,
    },
  },
};

export default SoracomSimAnomalyAlertScheduledTrigger;
