import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import { createSoracomClientFromEnv } from "../../lib/soracom/mod.ts";
import type {
  SoraCamEvent,
  SoraCamImageExport,
} from "../../lib/soracom/mod.ts";
import { soraCamDeviceIdSchema } from "../../lib/validation/schemas.ts";

/**
 * ソラカメ動体検知→画像キャプチャ複合関数定義
 *
 * 指定デバイスのモーションイベントを取得し、直近のイベントが見つかった場合は
 * そのタイミングの画像を自動エクスポートしてSlackに投稿します。
 */
export const SoracomSoraCamMotionCaptureFunctionDefinition = DefineFunction({
  callback_id: "soracom_soracam_motion_capture",
  title: "SoraCam Motion Capture",
  description:
    "Detect motion events and automatically export images from the recording",
  source_file: "functions/soracom_soracam_motion_capture/mod.ts",
  input_parameters: {
    properties: {
      device_id: {
        type: Schema.types.string,
        description: "SoraCam device ID",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel to post results",
      },
    },
    required: ["device_id", "channel_id"],
  },
  output_parameters: {
    properties: {
      device_id: {
        type: Schema.types.string,
        description: "Device ID",
      },
      event_count: {
        type: Schema.types.number,
        description: "Number of motion events detected",
      },
      exported_images: {
        type: Schema.types.number,
        description: "Number of images exported",
      },
      message: {
        type: Schema.types.string,
        description: "Result message",
      },
    },
    required: ["device_id", "event_count", "exported_images", "message"],
  },
});

/** エクスポート対象とするイベント種別 */
const MOTION_EVENT_TYPES = ["motion", "person"];

/**
 * モーションイベントをフィルタリングします
 *
 * @param events - イベント一覧
 * @returns モーション系イベントのみ
 */
export function filterMotionEvents(events: SoraCamEvent[]): SoraCamEvent[] {
  return events.filter((e) =>
    MOTION_EVENT_TYPES.includes(e.eventType.toLowerCase())
  );
}

/**
 * 動体検知→画像エクスポート結果のメッセージを生成します
 *
 * @param deviceId - デバイスID
 * @param motionEvents - モーションイベント一覧
 * @param exports - エクスポート結果一覧
 * @returns フォーマットされたSlackメッセージ
 */
export function formatMotionCaptureMessage(
  deviceId: string,
  motionEvents: SoraCamEvent[],
  exports: SoraCamImageExport[],
): string {
  if (motionEvents.length === 0) {
    return t("soracom.messages.soracam_motion_none", { deviceId });
  }

  const header = t("soracom.messages.soracam_motion_header", {
    deviceId,
    eventCount: motionEvents.length,
    imageCount: exports.length,
  });

  const exportLines = exports.map((exp) => {
    if (exp.status === "completed" && exp.url) {
      return `  :camera: ${t("soracom.messages.soracam_image_export_url", { url: exp.url })}`;
    }
    return `  :hourglass_flowing_sand: ${t("soracom.messages.soracam_image_export_processing", { exportId: exp.exportId })}`;
  });

  return `*${header}*\n\n${exportLines.join("\n")}`;
}

export default SlackFunction(
  SoracomSoraCamMotionCaptureFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      const validDeviceId = soraCamDeviceIdSchema.parse(inputs.device_id);

      console.log(
        t("soracom.logs.checking_soracam_motion", {
          deviceId: validDeviceId,
        }),
      );

      const soracomClient = createSoracomClientFromEnv();

      // 過去1時間のイベントを取得
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const events = await soracomClient.getSoraCamEvents(
        validDeviceId,
        oneHourAgo,
        now,
      );

      const motionEvents = filterMotionEvents(events);

      // 最新3件のモーションイベントの画像をエクスポート
      const targetEvents = motionEvents.slice(0, 3);
      const exports: SoraCamImageExport[] = [];

      for (const event of targetEvents) {
        const exportResult = await soracomClient.exportSoraCamImage(
          validDeviceId,
          event.eventTime,
        );
        exports.push(exportResult);
      }

      // 少し待機してからエクスポート結果を確認
      if (exports.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        for (let i = 0; i < exports.length; i++) {
          if (exports[i].status === "processing") {
            exports[i] = await soracomClient.getSoraCamImageExport(
              validDeviceId,
              exports[i].exportId,
            );
          }
        }
      }

      const message = formatMotionCaptureMessage(
        validDeviceId,
        motionEvents,
        exports,
      );

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          device_id: validDeviceId,
          event_count: motionEvents.length,
          exported_images: exports.length,
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_soracam_motion_capture error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
