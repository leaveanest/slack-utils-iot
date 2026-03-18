import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import AirQualityAlertWithSnapshotWorkflow from "../workflows/air_quality_alert_with_snapshot_workflow.ts";

/**
 * 空気品質アラートと画像確認トリガー
 *
 * link trigger から起動し、指定した環境センサーの最新の基準逸脱と
 * 近傍の SoraCam 画像をチャンネルに投稿します。
 * imsi と device_id はトリガー作成時にカスタマイズが必要です。
 */
const AirQualityAlertWithSnapshotTrigger: Trigger<
  typeof AirQualityAlertWithSnapshotWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "空気品質アラートと画像確認",
  description: "最新の基準逸脱と近傍の画像を確認します",
  workflow:
    `#/workflows/${AirQualityAlertWithSnapshotWorkflow.definition.callback_id}`,
  inputs: {
    imsi: {
      customizable: true,
    },
    device_id: {
      customizable: true,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default AirQualityAlertWithSnapshotTrigger;
