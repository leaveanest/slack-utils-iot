import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSimAnomalyAlertWorkflow from "../workflows/soracom_sim_anomaly_alert_workflow.ts";

/**
 * SIM異常検知アラートトリガー（ショートカット）
 *
 * 手動でSIM異常検知を実行する場合に使用します。
 */
const SoracomSimAnomalyAlertTrigger: Trigger<
  typeof SoracomSimAnomalyAlertWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "SIM Anomaly Check",
  description: "Check for SIMs with abnormal status",
  workflow:
    `#/workflows/${SoracomSimAnomalyAlertWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default SoracomSimAnomalyAlertTrigger;
