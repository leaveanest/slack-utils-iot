import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * SORACOMセンサープロファイル用データストア
 *
 * 日次レポート対象のセンサー設定を IMSI 単位で保存します。
 */
const SoracomSensorProfilesDatastore = DefineDatastore({
  name: "soracom_sensor_profiles",
  primary_key: "imsi",
  attributes: {
    imsi: {
      type: Schema.types.string,
      description: "センサーの IMSI",
    },
    sensor_name: {
      type: Schema.types.string,
      description: "センサーの表示名",
    },
    report_channel_id: {
      type: Schema.slack.types.channel_id,
      description: "日次レポートの投稿先チャンネル",
    },
    co2_threshold: {
      type: Schema.types.number,
      description: "CO2 しきい値（ppm、省略可）",
    },
    temperature_min: {
      type: Schema.types.number,
      description: "温度下限しきい値（C、省略可）",
    },
    temperature_max: {
      type: Schema.types.number,
      description: "温度上限しきい値（C、省略可）",
    },
    humidity_min: {
      type: Schema.types.number,
      description: "湿度下限しきい値（%、省略可）",
    },
    humidity_max: {
      type: Schema.types.number,
      description: "湿度上限しきい値（%、省略可）",
    },
    soracam_device_id: {
      type: Schema.types.string,
      description: "連携する SoraCam デバイス ID（省略可）",
    },
    lookback_hours: {
      type: Schema.types.number,
      description: "ダイジェスト参照時間（時間、省略可）",
    },
    updated_by: {
      type: Schema.slack.types.user_id,
      description: "このセンサープロファイルを最後に更新したユーザー",
    },
    updated_at: {
      type: Schema.types.string,
      description: "最終更新日時（ISO 8601）",
    },
  },
});

export default SoracomSensorProfilesDatastore;
