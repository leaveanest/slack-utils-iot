import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  compareAirQualitySummaries,
  createSoracomClientFromEnv,
  filterAirQualityEntriesByTimeRange,
  resolveAirQualityCriteria,
  summarizeAirQualityEntries,
} from "../../lib/soracom/mod.ts";
import type {
  AirQualityCriteria,
  SoraCamImageExport,
} from "../../lib/soracom/mod.ts";
import {
  imsiSchema,
  soraCamDeviceIdSchema,
} from "../../lib/validation/schemas.ts";
import { formatVentilationEffectReviewMessage } from "../ventilation_effect_review/mod.ts";

const DEFAULT_BEFORE_MINUTES = 60;
const DEFAULT_AFTER_MINUTES = 60;

/**
 * 換気確認とカメラ画像確認をまとめて行う関数定義
 */
export const VentilationCheckWithCameraFunctionDefinition = DefineFunction({
  callback_id: "ventilation_check_with_camera",
  title: "換気確認と画像確認",
  description: "換気前後を比較し、近傍の SoraCam 画像を添えて確認します",
  source_file: "functions/ventilation_check_with_camera/mod.ts",
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
      before_sample_count: {
        type: Schema.types.number,
        description: "基準時刻より前のサンプル数",
      },
      after_sample_count: {
        type: Schema.types.number,
        description: "基準時刻より後のサンプル数",
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
      "before_sample_count",
      "after_sample_count",
      "image_url",
      "message",
    ],
  },
});

/**
 * 換気確認結果にカメラ画像情報を付加したメッセージを生成します。
 *
 * @param reviewMessage - 換気効果レビュー本文
 * @param deviceId - SoraCam デバイス ID
 * @param referenceTime - Snapshot reference time
 * @param exportResult - Image export result
 * @returns フォーマット済みメッセージ
 */
export function formatVentilationCheckWithCameraMessage(
  reviewMessage: string,
  deviceId: string,
  referenceTime: number,
  exportResult: SoraCamImageExport | null,
): string {
  const cameraHeader = t(
    "soracom.messages.ventilation_check_with_camera_header",
    {
      deviceId,
      referenceTime: new Date(referenceTime).toISOString(),
    },
  );

  if (exportResult === null) {
    return [
      reviewMessage,
      "",
      `*${cameraHeader}*`,
      t("soracom.messages.ventilation_check_with_camera_snapshot_unavailable"),
    ].join("\n");
  }

  if (exportResult.status === "completed" && exportResult.url) {
    return [
      reviewMessage,
      "",
      `*${cameraHeader}*`,
      t("soracom.messages.ventilation_check_with_camera_snapshot_url", {
        url: exportResult.url,
      }),
    ].join("\n");
  }

  return [
    reviewMessage,
    "",
    `*${cameraHeader}*`,
    t("soracom.messages.ventilation_check_with_camera_snapshot_processing", {
      exportId: exportResult.exportId,
    }),
  ].join("\n");
}

export default SlackFunction(
  VentilationCheckWithCameraFunctionDefinition,
  async ({ inputs, client, env }) => {
    try {
      const validImsi = imsiSchema.parse(inputs.imsi);
      const validDeviceId = soraCamDeviceIdSchema.parse(inputs.device_id);
      const referenceTime = Date.parse(inputs.reference_time);
      const beforeMinutes = inputs.before_minutes ?? DEFAULT_BEFORE_MINUTES;
      const afterMinutes = inputs.after_minutes ?? DEFAULT_AFTER_MINUTES;
      const criteria = buildCriteria(inputs);

      if (
        !Number.isFinite(referenceTime) ||
        !Number.isFinite(beforeMinutes) ||
        beforeMinutes <= 0 ||
        !Number.isFinite(afterMinutes) ||
        afterMinutes <= 0
      ) {
        throw new Error(t("errors.invalid_input"));
      }

      console.log(
        t("soracom.logs.generating_ventilation_check_with_camera", {
          imsi: validImsi,
          deviceId: validDeviceId,
          referenceTime: new Date(referenceTime).toISOString(),
        }),
      );

      const soracomClient = createSoracomClientFromEnv(env);
      const beforeStartTime = referenceTime - beforeMinutes * 60 * 1000;
      const afterEndTime = referenceTime + afterMinutes * 60 * 1000;
      const result = await soracomClient.getHarvestData(
        validImsi,
        beforeStartTime,
        afterEndTime,
      );

      const beforeSummary = summarizeAirQualityEntries(
        filterAirQualityEntriesByTimeRange(
          result.entries,
          beforeStartTime,
          referenceTime,
        ),
        criteria,
      );
      const afterSummary = summarizeAirQualityEntries(
        filterAirQualityEntriesByTimeRange(
          result.entries,
          referenceTime,
          afterEndTime,
        ),
        criteria,
      );
      const comparison = compareAirQualitySummaries(
        beforeSummary,
        afterSummary,
      );
      const reviewMessage = formatVentilationEffectReviewMessage(
        validImsi,
        referenceTime,
        beforeSummary,
        afterSummary,
        comparison,
        beforeMinutes,
        afterMinutes,
      );

      let exportResult: SoraCamImageExport | null = await soracomClient
        .exportSoraCamImage(validDeviceId, referenceTime);

      if (exportResult.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        exportResult = await soracomClient.getSoraCamImageExport(
          validDeviceId,
          exportResult.exportId,
        );
      }

      const message = formatVentilationCheckWithCameraMessage(
        reviewMessage,
        validDeviceId,
        referenceTime,
        exportResult,
      );

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          imsi: validImsi,
          device_id: validDeviceId,
          before_sample_count: beforeSummary.sampleCount,
          after_sample_count: afterSummary.sampleCount,
          image_url: exportResult.url ?? "",
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("ventilation_check_with_camera error:", errorMessage);
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
