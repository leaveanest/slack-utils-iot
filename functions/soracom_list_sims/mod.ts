import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import { createSoracomClientFromEnv } from "../../lib/soracom/mod.ts";

/**
 * Soracom SIM一覧取得関数定義
 */
export const SoracomListSimsFunctionDefinition = DefineFunction({
  callback_id: "soracom_list_sims",
  title: "Soracom SIM List",
  description: "Fetch a list of SIMs from Soracom",
  source_file: "functions/soracom_list_sims/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel to post results",
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      sim_count: {
        type: Schema.types.number,
        description: "Number of SIMs returned",
      },
      message: {
        type: Schema.types.string,
        description: "Formatted SIM list message",
      },
    },
    required: ["sim_count", "message"],
  },
});

/**
 * SIM一覧をフォーマットされたメッセージに変換します
 *
 * @param sims - SIM一覧データ
 * @returns フォーマットされたSlackメッセージ文字列
 */
export function formatSimListMessage(
  sims: Array<{
    simId: string;
    imsi: string;
    status: string;
    speedClass: string;
    tags: Record<string, string>;
    ipAddress: string;
  }>,
): string {
  if (sims.length === 0) {
    return t("soracom.messages.no_sims_found");
  }

  const header = t("soracom.messages.sim_list_header", {
    count: sims.length,
  });

  const simLines = sims.map((sim) => {
    const name = sim.tags?.name || sim.simId;
    return [
      `*${name}*`,
      `  ${t("soracom.messages.sim_imsi", { imsi: sim.imsi })}`,
      `  ${t("soracom.messages.sim_status", { status: sim.status })}`,
      `  ${t("soracom.messages.sim_speed_class", { speedClass: sim.speedClass })}`,
      `  ${t("soracom.messages.sim_ip_address", { ipAddress: sim.ipAddress || "-" })}`,
    ].join("\n");
  });

  return `*${header}*\n\n${simLines.join("\n\n")}`;
}

export default SlackFunction(
  SoracomListSimsFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      console.log(t("soracom.logs.fetching_sims"));

      const soracomClient = createSoracomClientFromEnv();
      const result = await soracomClient.listSims();

      const message = formatSimListMessage(result.sims);

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          sim_count: result.total,
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_list_sims error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
