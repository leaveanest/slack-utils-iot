import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  CONFIG_KEYS,
  createSoracomClientFromEnv,
  extractAirQualitySample,
  getConfigValue,
  listSensorProfiles,
  resolveAirQualityCriteria as resolveSharedAirQualityCriteria,
} from "../../lib/soracom/mod.ts";
import type {
  AirQualityCriteria,
  AirQualitySample,
  HarvestDataEntry,
  SoraCamImageExport,
  SoracomSensorProfile,
} from "../../lib/soracom/mod.ts";
import {
  imsiSchema,
  soraCamDeviceIdSchema,
} from "../../lib/validation/schemas.ts";

const DEFAULT_LOOKBACK_HOURS = 24;

export type AirQualityViolation = {
  metric: "co2" | "temperature" | "humidity";
  value: number;
};

export type AirQualityAlertEvent = {
  time: number;
  sample: AirQualitySample;
  criteria: AirQualityCriteria;
  violations: AirQualityViolation[];
};

/**
 * 空気品質アラートと画像確認関数定義
 *
 * 直近の Harvest Data から最新の基準逸脱サンプルを見つけ、
 * 近傍の SoraCam 画像を添えて Slack に投稿します。
 */
export const AirQualityAlertWithSnapshotFunctionDefinition = DefineFunction({
  callback_id: "air_quality_alert_with_snapshot",
  title: "空気品質アラートと画像確認",
  description: "最新の基準逸脱を見つけ、近傍の SoraCam 画像を添えて共有します",
  source_file: "functions/air_quality_alert_with_snapshot/mod.ts",
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
        description: "結果を投稿するチャンネル",
      },
      lookback_hours: {
        type: Schema.types.number,
        description: "参照時間（時間）",
      },
    },
    required: ["imsi", "device_id", "channel_id"],
  },
  output_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "IMSI",
      },
      device_id: {
        type: Schema.types.string,
        description: "SoraCam デバイス ID",
      },
      alert_time: {
        type: Schema.types.string,
        description: "アラート時刻（ISO 8601）",
      },
      violation_count: {
        type: Schema.types.number,
        description: "アラート時点で基準逸脱した指標数",
      },
      image_url: {
        type: Schema.types.string,
        description: "スナップショット URL（取得できた場合）",
      },
      message: {
        type: Schema.types.string,
        description: "整形済みの結果メッセージ",
      },
    },
    required: [
      "imsi",
      "device_id",
      "alert_time",
      "violation_count",
      "image_url",
      "message",
    ],
  },
});

/**
 * センサープロファイルから適用する空気品質基準を解決します。
 *
 * Datastore に値がなければ既定値を使用します。
 *
 * @param profile - センサープロファイル
 * @returns 適用する空気品質基準
 */
export function resolveAirQualityCriteria(
  profile?: SoracomSensorProfile,
): AirQualityCriteria {
  return resolveSharedAirQualityCriteria({
    co2Max: profile?.co2Threshold,
    temperatureMin: profile?.temperatureMin,
    temperatureMax: profile?.temperatureMax,
    humidityMin: profile?.humidityMin,
    humidityMax: profile?.humidityMax,
  });
}

/**
 * 1 サンプルの基準逸脱を判定します。
 *
 * @param sample - 空気品質サンプル
 * @param criteria - 適用する基準
 * @returns 逸脱した指標一覧
 */
export function detectAirQualityViolations(
  sample: AirQualitySample,
  criteria: AirQualityCriteria,
): AirQualityViolation[] {
  const violations: AirQualityViolation[] = [];

  if (sample.co2 !== undefined && sample.co2 > criteria.co2Max) {
    violations.push({ metric: "co2", value: sample.co2 });
  }
  if (
    sample.temperature !== undefined &&
    (sample.temperature < criteria.temperatureMin ||
      sample.temperature > criteria.temperatureMax)
  ) {
    violations.push({ metric: "temperature", value: sample.temperature });
  }
  if (
    sample.humidity !== undefined &&
    (sample.humidity < criteria.humidityMin ||
      sample.humidity > criteria.humidityMax)
  ) {
    violations.push({ metric: "humidity", value: sample.humidity });
  }

  return violations;
}

/**
 * 最新の基準逸脱サンプルを返します。
 *
 * @param entries - Harvest Data エントリ
 * @param criteria - 適用する基準
 * @returns 最新の逸脱イベントまたは `null`
 */
export function findLatestAirQualityAlert(
  entries: HarvestDataEntry[],
  criteria: AirQualityCriteria,
): AirQualityAlertEvent | null {
  const samples = entries
    .map((entry) => extractAirQualitySample(entry))
    .filter((sample): sample is AirQualitySample => sample !== null)
    .sort((left, right) => right.time - left.time);

  for (const sample of samples) {
    const violations = detectAirQualityViolations(sample, criteria);
    if (violations.length === 0) {
      continue;
    }

    return {
      time: sample.time,
      sample,
      criteria,
      violations,
    };
  }

  return null;
}

/**
 * 空気品質アラート確認メッセージを生成します。
 *
 * @param imsi - IMSI
 * @param deviceId - SoraCam デバイス ID
 * @param alert - 逸脱イベント
 * @param exportResult - Snapshot export result
 * @returns Formatted Slack message
 */
export function formatAirQualityAlertWithSnapshotMessage(
  imsi: string,
  deviceId: string,
  alert: AirQualityAlertEvent | null,
  exportResult: SoraCamImageExport | null,
): string {
  const header = `*${
    t("soracom.messages.air_quality_alert_with_snapshot_header", {
      imsi,
      deviceId,
    })
  }*`;

  if (alert === null) {
    return [
      header,
      t("soracom.messages.air_quality_alert_with_snapshot_no_violation"),
    ].join("\n\n");
  }

  const lines = [
    header,
    t("soracom.messages.air_quality_alert_with_snapshot_criteria", {
      co2: formatMetricNumber(alert.criteria.co2Max),
      temperatureMin: formatMetricNumber(alert.criteria.temperatureMin),
      temperatureMax: formatMetricNumber(alert.criteria.temperatureMax),
      humidityMin: formatMetricNumber(alert.criteria.humidityMin),
      humidityMax: formatMetricNumber(alert.criteria.humidityMax),
    }),
    t("soracom.messages.air_quality_alert_with_snapshot_time", {
      time: new Date(alert.time).toISOString(),
    }),
    ...alert.violations.map((violation) =>
      t("soracom.messages.air_quality_alert_with_snapshot_violation", {
        label: formatViolationLabel(violation.metric),
        value: formatMetricNumber(violation.value),
        expected: formatViolationExpectation(violation.metric, alert.criteria),
      })
    ),
  ];

  if (exportResult === null) {
    lines.push(
      t("soracom.messages.air_quality_alert_with_snapshot_snapshot_unavailable"),
    );
    return lines.join("\n");
  }

  if (exportResult.status === "completed" && exportResult.url) {
    lines.push(
      t("soracom.messages.air_quality_alert_with_snapshot_snapshot_url", {
        url: exportResult.url,
      }),
    );
    return lines.join("\n");
  }

  lines.push(
    t("soracom.messages.air_quality_alert_with_snapshot_snapshot_processing", {
      exportId: exportResult.exportId,
    }),
  );
  return lines.join("\n");
}

function formatViolationLabel(metric: AirQualityViolation["metric"]): string {
  switch (metric) {
    case "co2":
      return t("soracom.messages.air_quality_metric_co2");
    case "temperature":
      return t("soracom.messages.air_quality_metric_temperature");
    case "humidity":
      return t("soracom.messages.air_quality_metric_humidity");
  }
}

function formatViolationExpectation(
  metric: AirQualityViolation["metric"],
  criteria: AirQualityCriteria,
): string {
  switch (metric) {
    case "co2":
      return `<= ${formatMetricNumber(criteria.co2Max)} ppm`;
    case "temperature":
      return `${formatMetricNumber(criteria.temperatureMin)} - ${
        formatMetricNumber(criteria.temperatureMax)
      } C`;
    case "humidity":
      return `${formatMetricNumber(criteria.humidityMin)} - ${
        formatMetricNumber(criteria.humidityMax)
      } %`;
  }
}

function formatMetricNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

export default SlackFunction(
  AirQualityAlertWithSnapshotFunctionDefinition,
  async ({ inputs, client, env }) => {
    try {
      const validImsi = imsiSchema.parse(inputs.imsi);
      const validDeviceId = soraCamDeviceIdSchema.parse(inputs.device_id);
      const profiles = await listSensorProfiles(client);
      const profile = profiles.find((item) => item.imsi === validImsi);
      const criteria = resolveAirQualityCriteria(profile);
      const lookbackHours = inputs.lookback_hours ?? profile?.lookbackHours ??
        DEFAULT_LOOKBACK_HOURS;

      if (!Number.isFinite(lookbackHours) || lookbackHours <= 0) {
        throw new Error(t("errors.invalid_input"));
      }

      console.log(
        t("soracom.logs.generating_air_quality_alert_with_snapshot", {
          imsi: validImsi,
          deviceId: validDeviceId,
        }),
      );

      const channelId = await getConfigValue(
        client,
        CONFIG_KEYS.SORACAM_CHANNEL_ID,
        inputs.channel_id,
        env,
      );

      const soracomClient = createSoracomClientFromEnv(env);
      const now = Date.now();
      const lookbackStart = now - lookbackHours * 60 * 60 * 1000;
      const harvest = await soracomClient.getHarvestData(
        validImsi,
        lookbackStart,
        now,
      );

      const alert = findLatestAirQualityAlert(harvest.entries, criteria);
      let exportResult: SoraCamImageExport | null = null;

      if (alert !== null) {
        exportResult = await soracomClient.exportSoraCamImage(
          validDeviceId,
          alert.time,
        );

        if (exportResult.status === "processing") {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          exportResult = await soracomClient.getSoraCamImageExport(
            validDeviceId,
            exportResult.exportId,
          );
        }
      }

      const message = formatAirQualityAlertWithSnapshotMessage(
        validImsi,
        validDeviceId,
        alert,
        exportResult,
      );

      await client.chat.postMessage({
        channel: channelId,
        text: message,
      });

      return {
        outputs: {
          imsi: validImsi,
          device_id: validDeviceId,
          alert_time: alert ? new Date(alert.time).toISOString() : "",
          violation_count: alert?.violations.length ?? 0,
          image_url: exportResult?.url ?? "",
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("air_quality_alert_with_snapshot error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
