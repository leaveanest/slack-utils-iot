import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomSimAnomalyAlertFunctionDefinition } from "../functions/soracom_sim_anomaly_alert/mod.ts";

/**
 * SIM異常検知アラートワークフロー
 *
 * SIM一覧を取得し、異常ステータスのSIMを検出してチャンネルに警告を投稿します。
 * Scheduled Triggerで定期実行することを推奨します。
 */
const SoracomSimAnomalyAlertWorkflow = DefineWorkflow({
  callback_id: "soracom_sim_anomaly_alert_workflow",
  title: "Soracom SIM Anomaly Alert",
  description: "Detect SIMs with abnormal status and alert the channel",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel for alerts",
      },
    },
    required: ["channel_id"],
  },
});

SoracomSimAnomalyAlertWorkflow.addStep(
  SoracomSimAnomalyAlertFunctionDefinition,
  {
    channel_id: SoracomSimAnomalyAlertWorkflow.inputs.channel_id,
  },
);

export default SoracomSimAnomalyAlertWorkflow;
