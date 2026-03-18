import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { MeetingRoomAirQualityReviewFunctionDefinition } from "../functions/meeting_room_air_quality_review/mod.ts";

/**
 * 会議室空気品質振り返りワークフロー
 *
 * 指定した会議室センサーの過去24時間の Harvest Data を振り返り、
 * CO2 のピーク時間帯を含む要約を Slack に投稿します。
 */
const MeetingRoomAirQualityReviewWorkflow = DefineWorkflow({
  callback_id: "meeting_room_air_quality_review_workflow",
  title: "会議室空気品質振り返り",
  description: "会議室の空気品質を振り返り、CO2 のピーク時間帯を示します",
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
      bucket_minutes: {
        type: Schema.types.number,
        description: "ピーク時間帯分析の集計幅（分）",
      },
    },
    required: ["imsi", "channel_id"],
  },
});

MeetingRoomAirQualityReviewWorkflow.addStep(
  MeetingRoomAirQualityReviewFunctionDefinition,
  {
    imsi: MeetingRoomAirQualityReviewWorkflow.inputs.imsi,
    channel_id: MeetingRoomAirQualityReviewWorkflow.inputs.channel_id,
    co2_threshold: MeetingRoomAirQualityReviewWorkflow.inputs.co2_threshold,
    temperature_min: MeetingRoomAirQualityReviewWorkflow.inputs.temperature_min,
    temperature_max: MeetingRoomAirQualityReviewWorkflow.inputs.temperature_max,
    humidity_min: MeetingRoomAirQualityReviewWorkflow.inputs.humidity_min,
    humidity_max: MeetingRoomAirQualityReviewWorkflow.inputs.humidity_max,
    bucket_minutes: MeetingRoomAirQualityReviewWorkflow.inputs.bucket_minutes,
  },
);

export default MeetingRoomAirQualityReviewWorkflow;
