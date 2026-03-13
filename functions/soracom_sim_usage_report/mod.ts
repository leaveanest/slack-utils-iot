import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  createSoracomClientFromEnv,
  formatBytes,
} from "../../lib/soracom/mod.ts";
import type { AirStatsResult, SoracomSim } from "../../lib/soracom/mod.ts";
import { CONFIG_KEYS, getConfigValue } from "../../lib/soracom/datastore.ts";

/**
 * SIMの通信量サマリー情報
 */
export interface SimUsageSummary {
  /** SIM名またはID */
  name: string;
  /** IMSI */
  imsi: string;
  /** SIMステータス */
  status: string;
  /** アップロード合計バイト数 */
  totalUpload: number;
  /** ダウンロード合計バイト数 */
  totalDownload: number;
}

/**
 * SIM通信量サマリーレポート関数定義
 *
 * 全SIMの通信量統計を取得し、サマリーレポートとしてSlackチャンネルに投稿します。
 * Scheduled Triggerと組み合わせて週次/月次レポートに利用できます。
 */
export const SoracomSimUsageReportFunctionDefinition = DefineFunction({
  callback_id: "soracom_sim_usage_report",
  title: "Soracom SIM Usage Report",
  description:
    "Generate a usage summary report for all SIMs and post to channel",
  source_file: "functions/soracom_sim_usage_report/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel to post report",
      },
      period: {
        type: Schema.types.string,
        description: "Report period: 'day' or 'month'",
      },
    },
    required: ["channel_id", "period"],
  },
  output_parameters: {
    properties: {
      sim_count: {
        type: Schema.types.number,
        description: "Number of SIMs in report",
      },
      total_upload: {
        type: Schema.types.string,
        description: "Total upload across all SIMs (formatted)",
      },
      total_download: {
        type: Schema.types.string,
        description: "Total download across all SIMs (formatted)",
      },
      message: {
        type: Schema.types.string,
        description: "Formatted report message",
      },
    },
    required: ["sim_count", "total_upload", "total_download", "message"],
  },
});

/**
 * SIMと通信量統計からサマリー情報を生成します
 *
 * @param sim - SIM情報
 * @param stats - 通信量統計
 * @returns サマリー情報
 */
export function buildSimUsageSummary(
  sim: SoracomSim,
  stats: AirStatsResult,
): SimUsageSummary {
  let totalUpload = 0;
  let totalDownload = 0;

  for (const dp of stats.dataPoints) {
    totalUpload += dp.uploadByteSizeTotal;
    totalDownload += dp.downloadByteSizeTotal;
  }

  return {
    name: sim.tags?.name || sim.simId,
    imsi: sim.imsi,
    status: sim.status,
    totalUpload,
    totalDownload,
  };
}

/**
 * SIM通信量レポートメッセージを生成します
 *
 * @param summaries - サマリー情報一覧
 * @param period - レポート期間
 * @returns フォーマットされたSlackメッセージ
 */
export function formatUsageReportMessage(
  summaries: SimUsageSummary[],
  period: string,
): string {
  if (summaries.length === 0) {
    return t("soracom.messages.no_sims_found");
  }

  let grandTotalUpload = 0;
  let grandTotalDownload = 0;

  const header = t("soracom.messages.sim_usage_report_header", {
    count: summaries.length,
    period,
  });

  const simLines = summaries.map((s) => {
    grandTotalUpload += s.totalUpload;
    grandTotalDownload += s.totalDownload;

    const upload = formatBytes(s.totalUpload);
    const download = formatBytes(s.totalDownload);

    return `  *${s.name}* (${s.status})\n    ${t("soracom.messages.air_usage_upload", { bytes: upload })} / ${t("soracom.messages.air_usage_download", { bytes: download })}`;
  });

  const grandTotal = t("soracom.messages.sim_usage_report_total", {
    upload: formatBytes(grandTotalUpload),
    download: formatBytes(grandTotalDownload),
  });

  return `*${header}*\n\n${simLines.join("\n\n")}\n\n*${grandTotal}*`;
}

export default SlackFunction(
  SoracomSimUsageReportFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      const period = (inputs.period === "month" ? "month" : "day") as
        | "day"
        | "month";

      console.log(
        t("soracom.logs.generating_usage_report", { period }),
      );

      // Datastoreからチャンネルを解決（フォールバック: トリガーで指定された値）
      const channelId = await getConfigValue(
        client,
        CONFIG_KEYS.REPORT_CHANNEL_ID,
        inputs.channel_id,
      );

      const soracomClient = createSoracomClientFromEnv();

      // SIM一覧を取得
      const simResult = await soracomClient.listSims(100);

      // activeなSIMのみ通信量を取得
      const activeSims = simResult.sims.filter(
        (sim) => sim.status === "active",
      );

      const now = Math.floor(Date.now() / 1000);
      const from = period === "month"
        ? now - 30 * 24 * 60 * 60
        : now - 24 * 60 * 60;

      const summaries: SimUsageSummary[] = [];

      for (const sim of activeSims) {
        try {
          const stats = await soracomClient.getAirUsage(
            sim.imsi,
            period,
            from,
            now,
          );
          summaries.push(buildSimUsageSummary(sim, stats));
        } catch (error) {
          // 個別SIMの取得失敗はスキップしてレポートを続行
          console.warn(
            `Failed to get usage for ${sim.imsi}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      const message = formatUsageReportMessage(summaries, period);

      let grandTotalUpload = 0;
      let grandTotalDownload = 0;
      for (const s of summaries) {
        grandTotalUpload += s.totalUpload;
        grandTotalDownload += s.totalDownload;
      }

      await client.chat.postMessage({
        channel: channelId,
        text: message,
      });

      return {
        outputs: {
          sim_count: summaries.length,
          total_upload: formatBytes(grandTotalUpload),
          total_download: formatBytes(grandTotalDownload),
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_sim_usage_report error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
