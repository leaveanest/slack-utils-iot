import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { VentilationCheckWithCameraFunctionDefinition } from "../functions/ventilation_check_with_camera/mod.ts";

/**
 * 換気確認とカメラ画像確認ワークフロー
 */
const VentilationCheckWithCameraWorkflow = DefineWorkflow({
  callback_id: "ventilation_check_with_camera_workflow",
  title: "換気確認と画像確認",
  description: "換気前後を比較し、近傍のカメラ画像を添えて確認します",
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
      reference_time: {
        type: Schema.types.string,
        description: "基準時刻（ISO 8601 形式）",
      },
      before_minutes: {
        type: Schema.types.number,
        description: "基準時刻より前の集計時間（分）",
      },
      after_minutes: {
        type: Schema.types.number,
        description: "基準時刻より後の集計時間（分）",
      },
      co2_threshold: {
        type: Schema.types.number,
        description: "CO2 アラートしきい値（ppm）",
      },
      temperature_min: {
        type: Schema.types.number,
        description: "温度下限しきい値（C）",
      },
      temperature_max: {
        type: Schema.types.number,
        description: "温度上限しきい値（C）",
      },
      humidity_min: {
        type: Schema.types.number,
        description: "湿度下限しきい値（%）",
      },
      humidity_max: {
        type: Schema.types.number,
        description: "湿度上限しきい値（%）",
      },
    },
    required: ["imsi", "device_id", "channel_id", "reference_time"],
  },
});

VentilationCheckWithCameraWorkflow.addStep(
  VentilationCheckWithCameraFunctionDefinition,
  {
    imsi: VentilationCheckWithCameraWorkflow.inputs.imsi,
    device_id: VentilationCheckWithCameraWorkflow.inputs.device_id,
    channel_id: VentilationCheckWithCameraWorkflow.inputs.channel_id,
    reference_time: VentilationCheckWithCameraWorkflow.inputs.reference_time,
    before_minutes: VentilationCheckWithCameraWorkflow.inputs.before_minutes,
    after_minutes: VentilationCheckWithCameraWorkflow.inputs.after_minutes,
    co2_threshold: VentilationCheckWithCameraWorkflow.inputs.co2_threshold,
    temperature_min: VentilationCheckWithCameraWorkflow.inputs.temperature_min,
    temperature_max: VentilationCheckWithCameraWorkflow.inputs.temperature_max,
    humidity_min: VentilationCheckWithCameraWorkflow.inputs.humidity_min,
    humidity_max: VentilationCheckWithCameraWorkflow.inputs.humidity_max,
  },
);

export default VentilationCheckWithCameraWorkflow;
