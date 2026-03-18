import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  resolveAirQualityCriteria,
  upsertSensorProfile,
} from "../../lib/soracom/mod.ts";
import {
  channelIdSchema,
  imsiSchema,
  nonEmptyStringSchema,
  soraCamDeviceIdSchema,
} from "../../lib/validation/schemas.ts";

/**
 * センサープロファイル更新関数定義
 *
 * 日次レポート対象のセンサー設定を Datastore に保存します。
 */
export const SoracomUpdateSensorProfileFunctionDefinition = DefineFunction({
  callback_id: "soracom_update_sensor_profile",
  title: "センサープロファイル更新",
  description: "日次レポート用のセンサープロファイルを保存します",
  source_file: "functions/soracom_update_sensor_profile/mod.ts",
  input_parameters: {
    properties: {
      sensor_name: {
        type: Schema.types.string,
        description: "センサーの表示名",
      },
      imsi: {
        type: Schema.types.string,
        description: "加入者の IMSI（15 桁）",
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
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "確認メッセージを投稿するチャンネル",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "更新を実行したユーザー",
      },
    },
    required: [
      "sensor_name",
      "imsi",
      "report_channel_id",
      "channel_id",
      "user_id",
    ],
  },
  output_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "IMSI",
      },
      sensor_name: {
        type: Schema.types.string,
        description: "センサーの表示名",
      },
      message: {
        type: Schema.types.string,
        description: "確認メッセージ",
      },
    },
    required: ["imsi", "sensor_name", "message"],
  },
});

export type SensorProfileFormInput = {
  sensorName: string;
  imsi: string;
  reportChannelId: string;
  co2Threshold?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  soraCamDeviceId?: string;
  lookbackHours?: number;
};

/**
 * 入力を正規化し、センサープロファイル保存用の値に変換します。
 *
 * @param inputs - Workflow入力
 * @returns 正規化済みセンサープロファイル入力
 */
export function normalizeSensorProfileInputs(
  inputs: {
    sensor_name: string;
    imsi: string;
    report_channel_id: string;
    co2_threshold?: number;
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
    soracam_device_id?: string;
    lookback_hours?: number;
  },
): SensorProfileFormInput {
  const sensorName = nonEmptyStringSchema.parse(inputs.sensor_name.trim());
  const imsi = imsiSchema.parse(inputs.imsi);
  const reportChannelId = channelIdSchema.parse(inputs.report_channel_id);
  const soraCamDeviceId = inputs.soracam_device_id?.trim();

  if (
    inputs.co2_threshold !== undefined &&
    (!Number.isFinite(inputs.co2_threshold) || inputs.co2_threshold <= 0)
  ) {
    throw new Error(t("errors.invalid_input"));
  }

  if (
    inputs.lookback_hours !== undefined &&
    (!Number.isFinite(inputs.lookback_hours) || inputs.lookback_hours <= 0)
  ) {
    throw new Error(t("errors.invalid_input"));
  }

  try {
    resolveAirQualityCriteria({
      co2Max: inputs.co2_threshold,
      temperatureMin: inputs.temperature_min,
      temperatureMax: inputs.temperature_max,
      humidityMin: inputs.humidity_min,
      humidityMax: inputs.humidity_max,
    });
  } catch {
    throw new Error(t("errors.invalid_input"));
  }

  return {
    sensorName,
    imsi,
    reportChannelId,
    co2Threshold: inputs.co2_threshold,
    temperatureMin: inputs.temperature_min,
    temperatureMax: inputs.temperature_max,
    humidityMin: inputs.humidity_min,
    humidityMax: inputs.humidity_max,
    soraCamDeviceId: soraCamDeviceId
      ? soraCamDeviceIdSchema.parse(soraCamDeviceId)
      : undefined,
    lookbackHours: inputs.lookback_hours,
  };
}

/**
 * 保存完了メッセージを生成します。
 *
 * @param profile - 保存済みセンサープロファイル
 * @returns フォーマット済みメッセージ
 */
export function formatSensorProfileSavedMessage(
  profile: SensorProfileFormInput,
): string {
  const criteria = resolveAirQualityCriteria({
    co2Max: profile.co2Threshold,
    temperatureMin: profile.temperatureMin,
    temperatureMax: profile.temperatureMax,
    humidityMin: profile.humidityMin,
    humidityMax: profile.humidityMax,
  });
  const lines = [
    t("soracom.messages.sensor_profile_updated", {
      sensorName: profile.sensorName,
      imsi: profile.imsi,
    }),
    t("soracom.messages.sensor_profile_report_channel", {
      channelId: profile.reportChannelId,
    }),
    t("soracom.messages.sensor_profile_co2_threshold", {
      threshold: formatNumber(criteria.co2Max),
    }),
    t("soracom.messages.sensor_profile_temperature_range", {
      min: formatNumber(criteria.temperatureMin),
      max: formatNumber(criteria.temperatureMax),
    }),
    t("soracom.messages.sensor_profile_humidity_range", {
      min: formatNumber(criteria.humidityMin),
      max: formatNumber(criteria.humidityMax),
    }),
  ];

  if (profile.soraCamDeviceId !== undefined) {
    lines.push(
      t("soracom.messages.sensor_profile_soracam_device_id", {
        deviceId: profile.soraCamDeviceId,
      }),
    );
  }

  if (profile.lookbackHours !== undefined) {
    lines.push(
      t("soracom.messages.sensor_profile_lookback_hours", {
        hours: formatNumber(profile.lookbackHours),
      }),
    );
  }

  return lines.join("\n");
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

export default SlackFunction(
  SoracomUpdateSensorProfileFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      console.log(
        t("soracom.logs.updating_sensor_profile", {
          imsi: inputs.imsi,
        }),
      );

      const profile = normalizeSensorProfileInputs(inputs);

      await upsertSensorProfile(client, profile, inputs.user_id);

      const message = formatSensorProfileSavedMessage(profile);

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          imsi: profile.imsi,
          sensor_name: profile.sensorName,
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_update_sensor_profile error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
