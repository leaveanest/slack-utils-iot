import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { AirQualityAlertWithSnapshotFunctionDefinition } from "../functions/air_quality_alert_with_snapshot/mod.ts";

/**
 * 空気品質アラートと画像確認ワークフロー
 *
 * 指定した環境センサーと SoraCam デバイスを組み合わせ、
 * 直近の基準逸脱時刻に近い画像を確認します。
 */
const AirQualityAlertWithSnapshotWorkflow = DefineWorkflow({
  callback_id: "air_quality_alert_with_snapshot_workflow",
  title: "空気品質アラートと画像確認",
  description: "最新の基準逸脱時刻に近い SoraCam 画像を添えて共有します",
  input_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "加入者の IMSI（15 桁）",
      },
      device_id: {
        type: Schema.types.string,
        description: "SoraCam デバイス ID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "レポート投稿先チャンネル",
      },
      lookback_hours: {
        type: Schema.types.number,
        description: "参照時間（時間）",
      },
    },
    required: ["imsi", "device_id", "channel_id"],
  },
});

AirQualityAlertWithSnapshotWorkflow.addStep(
  AirQualityAlertWithSnapshotFunctionDefinition,
  {
    imsi: AirQualityAlertWithSnapshotWorkflow.inputs.imsi,
    device_id: AirQualityAlertWithSnapshotWorkflow.inputs.device_id,
    channel_id: AirQualityAlertWithSnapshotWorkflow.inputs.channel_id,
    lookback_hours: AirQualityAlertWithSnapshotWorkflow.inputs.lookback_hours,
  },
);

export default AirQualityAlertWithSnapshotWorkflow;
