import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { VentilationEffectReviewFunctionDefinition } from "../functions/ventilation_effect_review/mod.ts";

/**
 * 換気効果振り返りワークフロー
 *
 * 指定時刻の前後で空気品質を比較し、換気対応の効果を Slack に投稿します。
 */
const VentilationEffectReviewWorkflow = DefineWorkflow({
  callback_id: "ventilation_effect_review_workflow",
  title: "換気効果振り返り",
  description: "換気前後の空気品質を比較して振り返ります",
  input_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "加入者の IMSI（15 桁）",
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
    required: ["imsi", "channel_id", "reference_time"],
  },
});

VentilationEffectReviewWorkflow.addStep(
  VentilationEffectReviewFunctionDefinition,
  {
    imsi: VentilationEffectReviewWorkflow.inputs.imsi,
    channel_id: VentilationEffectReviewWorkflow.inputs.channel_id,
    reference_time: VentilationEffectReviewWorkflow.inputs.reference_time,
    before_minutes: VentilationEffectReviewWorkflow.inputs.before_minutes,
    after_minutes: VentilationEffectReviewWorkflow.inputs.after_minutes,
    co2_threshold: VentilationEffectReviewWorkflow.inputs.co2_threshold,
    temperature_min: VentilationEffectReviewWorkflow.inputs.temperature_min,
    temperature_max: VentilationEffectReviewWorkflow.inputs.temperature_max,
    humidity_min: VentilationEffectReviewWorkflow.inputs.humidity_min,
    humidity_max: VentilationEffectReviewWorkflow.inputs.humidity_max,
  },
);

export default VentilationEffectReviewWorkflow;
