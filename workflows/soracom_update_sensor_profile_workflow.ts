import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SoracomUpdateSensorProfileFunctionDefinition } from "../functions/soracom_update_sensor_profile/mod.ts";

/**
 * センサープロファイル更新ワークフロー
 *
 * 日次レポート対象のセンサー設定をモーダルフォームから保存します。
 */
const SoracomUpdateSensorProfileWorkflow = DefineWorkflow({
  callback_id: "soracom_update_sensor_profile_workflow",
  title: "センサープロファイル更新",
  description: "モーダルフォームから日次レポート用センサー設定を保存します",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
        description: "フォームを開くためのインタラクティビティコンテキスト",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "ショートカットが実行されたチャンネル",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "実行したユーザー",
      },
    },
    required: ["interactivity", "channel_id", "user_id"],
  },
});

const formStep = SoracomUpdateSensorProfileWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "センサー設定",
    submit_label: "保存",
    description: "日次レポート対象のセンサー設定を保存します",
    interactivity: SoracomUpdateSensorProfileWorkflow.inputs.interactivity,
    fields: {
      required: ["sensor_name", "imsi", "report_channel_id"],
      elements: [
        {
          name: "sensor_name",
          title: "センサー名",
          type: Schema.types.string,
        },
        {
          name: "imsi",
          title: "IMSI",
          type: Schema.types.string,
        },
        {
          name: "report_channel_id",
          title: "レポート投稿先",
          type: Schema.slack.types.channel_id,
        },
        {
          name: "co2_threshold",
          title: "CO2しきい値(ppm)",
          type: Schema.types.number,
        },
        {
          name: "temperature_min",
          title: "温度下限(C)",
          type: Schema.types.number,
        },
        {
          name: "temperature_max",
          title: "温度上限(C)",
          type: Schema.types.number,
        },
        {
          name: "humidity_min",
          title: "湿度下限(%)",
          type: Schema.types.number,
        },
        {
          name: "humidity_max",
          title: "湿度上限(%)",
          type: Schema.types.number,
        },
        {
          name: "soracam_device_id",
          title: "SoraCamデバイスID",
          type: Schema.types.string,
        },
        {
          name: "lookback_hours",
          title: "ダイジェスト参照時間(時間)",
          type: Schema.types.number,
        },
      ],
    },
  },
);

SoracomUpdateSensorProfileWorkflow.addStep(
  SoracomUpdateSensorProfileFunctionDefinition,
  {
    sensor_name: formStep.outputs.fields.sensor_name,
    imsi: formStep.outputs.fields.imsi,
    report_channel_id: formStep.outputs.fields.report_channel_id,
    co2_threshold: formStep.outputs.fields.co2_threshold,
    temperature_min: formStep.outputs.fields.temperature_min,
    temperature_max: formStep.outputs.fields.temperature_max,
    humidity_min: formStep.outputs.fields.humidity_min,
    humidity_max: formStep.outputs.fields.humidity_max,
    soracam_device_id: formStep.outputs.fields.soracam_device_id,
    lookback_hours: formStep.outputs.fields.lookback_hours,
    channel_id: SoracomUpdateSensorProfileWorkflow.inputs.channel_id,
    user_id: SoracomUpdateSensorProfileWorkflow.inputs.user_id,
  },
);

export default SoracomUpdateSensorProfileWorkflow;
