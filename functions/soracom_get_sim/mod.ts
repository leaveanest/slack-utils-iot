import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import { createSoracomClientFromEnv } from "../../lib/soracom/mod.ts";
import { simIdSchema } from "../../lib/validation/schemas.ts";

/**
 * Soracom SIM詳細取得関数定義
 */
export const SoracomGetSimFunctionDefinition = DefineFunction({
  callback_id: "soracom_get_sim",
  title: "SORACOM SIM詳細",
  description: "指定した SIM の詳細を取得して表示します",
  source_file: "functions/soracom_get_sim/mod.ts",
  input_parameters: {
    properties: {
      sim_id: {
        type: Schema.types.string,
        description: "SORACOM SIM ID（ICCID）",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "結果を投稿するチャンネル",
      },
    },
    required: ["sim_id", "channel_id"],
  },
  output_parameters: {
    properties: {
      sim_id: {
        type: Schema.types.string,
        description: "SIM ID",
      },
      imsi: {
        type: Schema.types.string,
        description: "IMSI",
      },
      status: {
        type: Schema.types.string,
        description: "SIM ステータス",
      },
      speed_class: {
        type: Schema.types.string,
        description: "速度クラス",
      },
      ip_address: {
        type: Schema.types.string,
        description: "IP アドレス",
      },
      message: {
        type: Schema.types.string,
        description: "整形済みの SIM 詳細メッセージ",
      },
    },
    required: ["sim_id", "status", "message"],
  },
});

/**
 * SIM詳細情報をフォーマットされたメッセージに変換します
 *
 * @param sim - SIM詳細データ
 * @returns フォーマットされたSlackメッセージ文字列
 */
export function formatSimDetailMessage(
  sim: {
    simId: string;
    imsi: string;
    status: string;
    speedClass: string;
    tags: Record<string, string>;
    ipAddress: string;
    subscription: string;
  },
): string {
  const header = t("soracom.messages.sim_detail_header", {
    simId: sim.simId,
  });
  const name = sim.tags?.name || sim.simId;

  return [
    `*${header}*`,
    `*${name}*`,
    t("soracom.messages.sim_imsi", { imsi: sim.imsi }),
    t("soracom.messages.sim_status", { status: sim.status }),
    t("soracom.messages.sim_speed_class", { speedClass: sim.speedClass }),
    t("soracom.messages.sim_ip_address", { ipAddress: sim.ipAddress || "-" }),
    t("soracom.messages.sim_subscription", {
      subscription: sim.subscription,
    }),
  ].join("\n");
}

export default SlackFunction(
  SoracomGetSimFunctionDefinition,
  async ({ inputs, client, env }) => {
    try {
      const validSimId = simIdSchema.parse(inputs.sim_id);

      console.log(
        t("soracom.logs.fetching_sim_detail", { simId: validSimId }),
      );

      const soracomClient = createSoracomClientFromEnv(env);
      const sim = await soracomClient.getSim(validSimId);

      const message = formatSimDetailMessage(sim);

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          sim_id: sim.simId,
          imsi: sim.imsi,
          status: sim.status,
          speed_class: sim.speedClass,
          ip_address: sim.ipAddress || "",
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_get_sim error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
