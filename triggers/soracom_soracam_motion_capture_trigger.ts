import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SoracomSoraCamMotionCaptureWorkflow from "../workflows/soracom_soracam_motion_capture_workflow.ts";

/**
 * ソラカメ動体検知→画像キャプチャトリガー（ショートカット）
 *
 * 手動で動体検知+画像エクスポートを実行する場合に使用します。
 */
const SoracomSoraCamMotionCaptureTrigger: Trigger<
  typeof SoracomSoraCamMotionCaptureWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "SoraCam Motion Capture",
  description: "Check for motion events and capture images",
  workflow:
    `#/workflows/${SoracomSoraCamMotionCaptureWorkflow.definition.callback_id}`,
  inputs: {
    device_id: {
      value: "",
      customizable: true,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default SoracomSoraCamMotionCaptureTrigger;
