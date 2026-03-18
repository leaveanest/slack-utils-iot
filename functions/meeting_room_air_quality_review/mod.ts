import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  bucketAirQualityEntries,
  CONFIG_KEYS,
  createSoracomClientFromEnv,
  findPeakCo2Bucket,
  getConfigValue,
  resolveAirQualityCriteria,
  summarizeAirQualityEntries,
} from "../../lib/soracom/mod.ts";
import type {
  AirQualityBucketSummary,
  AirQualityCriteria,
  AirQualityMetricSummary,
  AirQualitySummary,
} from "../../lib/soracom/mod.ts";
import { imsiSchema } from "../../lib/validation/schemas.ts";

const DEFAULT_BUCKET_MINUTES = 60;

type AirQualityCriteriaView = {
  co2Max: number;
  temperatureMin: number;
  temperatureMax: number;
  humidityMin: number;
  humidityMax: number;
  co2ViolationCount: number;
  temperatureViolationCount: number;
  humidityViolationCount: number;
};

/**
 * 会議室空気品質振り返り関数定義
 *
 * 直近24時間の Harvest Data から CO2 のピーク時間帯を抽出し、
 * 会議室センサーの振り返りメッセージを Slack に投稿します。
 */
export const MeetingRoomAirQualityReviewFunctionDefinition = DefineFunction({
  callback_id: "meeting_room_air_quality_review",
  title: "会議室空気品質振り返り",
  description: "会議室の空気品質を振り返り、CO2 のピーク時間帯を示します",
  source_file: "functions/meeting_room_air_quality_review/mod.ts",
  input_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "加入者の IMSI（15 桁）",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "結果を投稿するチャンネル",
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
  output_parameters: {
    properties: {
      imsi: {
        type: Schema.types.string,
        description: "IMSI",
      },
      sample_count: {
        type: Schema.types.number,
        description: "集計した空気品質サンプル数",
      },
      peak_start_time: {
        type: Schema.types.string,
        description: "CO2 ピーク時間帯の開始時刻（ISO 8601）",
      },
      peak_end_time: {
        type: Schema.types.string,
        description: "CO2 ピーク時間帯の終了時刻（ISO 8601）",
      },
      message: {
        type: Schema.types.string,
        description: "整形済みの会議室振り返りメッセージ",
      },
    },
    required: [
      "imsi",
      "sample_count",
      "peak_start_time",
      "peak_end_time",
      "message",
    ],
  },
});

/**
 * 会議室空気品質振り返りメッセージを生成します。
 *
 * @param imsi - IMSI
 * @param summary - 日次空気品質サマリー
 * @param peakBucket - CO2ピーク時間帯
 * @returns フォーマット済みメッセージ
 */
export function formatMeetingRoomAirQualityReviewMessage(
  imsi: string,
  summary: AirQualitySummary,
  peakBucket: AirQualityBucketSummary | null,
): string {
  const criteria = getAirQualityCriteriaView(summary);
  const header = `*${
    t("soracom.messages.meeting_room_air_quality_review_header", { imsi })
  }*`;

  if (summary.sampleCount === 0 || peakBucket === null) {
    return [
      header,
      t("soracom.messages.meeting_room_air_quality_review_no_data"),
    ].join("\n\n");
  }

  return [
    header,
    t("soracom.messages.air_quality_sample_count", {
      count: summary.sampleCount,
    }),
    ...formatCriteriaViolationLines(criteria),
    t("soracom.messages.meeting_room_air_quality_review_peak_window", {
      start: new Date(peakBucket.startTime).toISOString(),
      end: new Date(peakBucket.endTime).toISOString(),
    }),
    peakBucket.summary.co2.average !== undefined
      ? t("soracom.messages.meeting_room_air_quality_review_peak_co2", {
        value: formatMetricNumber(peakBucket.summary.co2.average),
      })
      : t("soracom.messages.meeting_room_air_quality_review_peak_co2_missing"),
    formatMetricSummaryLine(
      t("soracom.messages.air_quality_metric_co2"),
      summary.co2,
    ),
    formatMetricSummaryLine(
      t("soracom.messages.air_quality_metric_temperature"),
      summary.temperature,
    ),
    formatMetricSummaryLine(
      t("soracom.messages.air_quality_metric_humidity"),
      summary.humidity,
    ),
  ].join("\n");
}

/**
 * 1つのメトリクス要約を表示用文字列に変換します。
 *
 * @param label - 表示名
 * @param summary - メトリクス要約
 * @returns フォーマット済み文字列
 */
function formatMetricSummaryLine(
  label: string,
  summary: AirQualityMetricSummary,
): string {
  if (
    summary.latest === undefined ||
    summary.average === undefined ||
    summary.min === undefined ||
    summary.max === undefined
  ) {
    return t("soracom.messages.air_quality_metric_unavailable", { label });
  }

  return t("soracom.messages.air_quality_metric_line", {
    label,
    latest: formatMetricNumber(summary.latest),
    average: formatMetricNumber(summary.average),
    min: formatMetricNumber(summary.min),
    max: formatMetricNumber(summary.max),
  });
}

/**
 * 数値を表示向けに丸めて文字列化します。
 *
 * @param value - 表示対象の数値
 * @returns 文字列化された数値
 */
function formatMetricNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function formatCriteriaViolationLines(
  criteria: AirQualityCriteriaView,
): [string, string, string] {
  return [
    t("soracom.messages.air_quality_co2_violation_count", {
      threshold: formatMetricNumber(criteria.co2Max),
      count: criteria.co2ViolationCount,
    }),
    t("soracom.messages.air_quality_temperature_violation_count", {
      min: formatMetricNumber(criteria.temperatureMin),
      max: formatMetricNumber(criteria.temperatureMax),
      count: criteria.temperatureViolationCount,
    }),
    t("soracom.messages.air_quality_humidity_violation_count", {
      min: formatMetricNumber(criteria.humidityMin),
      max: formatMetricNumber(criteria.humidityMax),
      count: criteria.humidityViolationCount,
    }),
  ];
}

function getAirQualityCriteriaView(
  summary: AirQualitySummary,
): AirQualityCriteriaView {
  return {
    co2Max: summary.criteria.co2Max,
    temperatureMin: summary.criteria.temperatureMin,
    temperatureMax: summary.criteria.temperatureMax,
    humidityMin: summary.criteria.humidityMin,
    humidityMax: summary.criteria.humidityMax,
    co2ViolationCount: summary.co2ThresholdExceededCount,
    temperatureViolationCount: summary.temperatureOutOfRangeCount,
    humidityViolationCount: summary.humidityOutOfRangeCount,
  };
}

export default SlackFunction(
  MeetingRoomAirQualityReviewFunctionDefinition,
  async ({ inputs, client, env }) => {
    try {
      const validImsi = imsiSchema.parse(inputs.imsi);
      const bucketMinutes = inputs.bucket_minutes ?? DEFAULT_BUCKET_MINUTES;
      const criteria = buildCriteria(inputs);

      if (
        !Number.isFinite(bucketMinutes) ||
        bucketMinutes <= 0
      ) {
        throw new Error(t("errors.invalid_input"));
      }

      console.log(
        t("soracom.logs.generating_meeting_room_air_quality_review", {
          imsi: validImsi,
        }),
      );

      const channelId = await getConfigValue(
        client,
        CONFIG_KEYS.REPORT_CHANNEL_ID,
        inputs.channel_id,
        env,
      );

      const soracomClient = createSoracomClientFromEnv(env);
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const result = await soracomClient.getHarvestData(
        validImsi,
        oneDayAgo,
        now,
      );

      const summary = summarizeAirQualityEntries(result.entries, criteria);
      const peakBucket = findPeakCo2Bucket(
        bucketAirQualityEntries(
          result.entries,
          bucketMinutes * 60 * 1000,
          criteria,
        ),
      );
      const message = formatMeetingRoomAirQualityReviewMessage(
        validImsi,
        summary,
        peakBucket,
      );

      await client.chat.postMessage({
        channel: channelId,
        text: message,
      });

      return {
        outputs: {
          imsi: validImsi,
          sample_count: summary.sampleCount,
          peak_start_time: peakBucket
            ? new Date(peakBucket.startTime).toISOString()
            : "",
          peak_end_time: peakBucket
            ? new Date(peakBucket.endTime).toISOString()
            : "",
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("meeting_room_air_quality_review error:", errorMessage);
      return { error: errorMessage };
    }
  },
);

function buildCriteria(
  inputs: {
    co2_threshold?: number;
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
  },
): AirQualityCriteria {
  try {
    return resolveAirQualityCriteria({
      co2Max: inputs.co2_threshold,
      temperatureMin: inputs.temperature_min,
      temperatureMax: inputs.temperature_max,
      humidityMin: inputs.humidity_min,
      humidityMax: inputs.humidity_max,
    });
  } catch {
    throw new Error(t("errors.invalid_input"));
  }
}
