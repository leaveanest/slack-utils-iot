import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";
import {
  CONFIG_KEYS,
  getAllConfigValues,
  setConfigValue,
} from "../../lib/soracom/datastore.ts";
import { channelIdSchema } from "../../lib/validation/schemas.ts";

/** 有効な設定キー一覧 */
const VALID_CONFIG_KEYS = Object.values(CONFIG_KEYS);

/**
 * Soracom設定更新関数定義
 *
 * Datastoreに設定値を保存/更新します。
 * 設定キーと値を指定して実行します。
 */
export const SoracomUpdateConfigFunctionDefinition = DefineFunction({
  callback_id: "soracom_update_config",
  title: "Soracom Update Config",
  description: "Update Soracom configuration values in the datastore",
  source_file: "functions/soracom_update_config/mod.ts",
  input_parameters: {
    properties: {
      config_key: {
        type: Schema.types.string,
        description:
          "Configuration key (alert_channel_id, report_channel_id, soracam_channel_id)",
        enum: VALID_CONFIG_KEYS,
      },
      config_value: {
        type: Schema.types.string,
        description: "Configuration value (e.g., channel ID)",
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel to post confirmation",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User who triggered the update",
      },
    },
    required: ["config_key", "config_value", "channel_id", "user_id"],
  },
  output_parameters: {
    properties: {
      config_key: {
        type: Schema.types.string,
        description: "Updated config key",
      },
      config_value: {
        type: Schema.types.string,
        description: "Updated config value",
      },
      message: {
        type: Schema.types.string,
        description: "Confirmation message",
      },
    },
    required: ["config_key", "config_value", "message"],
  },
});

/**
 * 設定値のバリデーションを行います
 *
 * @param configKey - 設定キー
 * @param configValue - 設定値
 * @throws {Error} バリデーションエラー
 */
export function validateConfigValue(
  configKey: string,
  configValue: string,
): void {
  if (!VALID_CONFIG_KEYS.includes(configKey as typeof VALID_CONFIG_KEYS[number])) {
    throw new Error(
      t("soracom.errors.config_invalid_key", {
        key: configKey,
        validKeys: VALID_CONFIG_KEYS.join(", "),
      }),
    );
  }

  // チャンネルID系の設定は形式を検証
  if (configKey.endsWith("_channel_id")) {
    channelIdSchema.parse(configValue);
  }
}

/**
 * 全設定一覧のフォーマットメッセージを生成します
 *
 * @param config - 設定キーと値のマップ
 * @returns フォーマットされたメッセージ
 */
export function formatConfigListMessage(
  config: Record<string, string>,
): string {
  const entries = Object.entries(config);
  if (entries.length === 0) {
    return t("soracom.messages.config_empty");
  }

  const header = t("soracom.messages.config_list_header", {
    count: entries.length,
  });

  const lines = entries.map(([key, value]) => `  *${key}*: \`${value}\``);

  return `*${header}*\n\n${lines.join("\n")}`;
}

export default SlackFunction(
  SoracomUpdateConfigFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      console.log(
        t("soracom.logs.updating_config", {
          key: inputs.config_key,
        }),
      );

      // バリデーション
      validateConfigValue(inputs.config_key, inputs.config_value);

      // Datastoreに保存
      await setConfigValue(
        client,
        inputs.config_key,
        inputs.config_value,
        inputs.user_id,
      );

      // 全設定を取得して一覧表示
      const allConfig = await getAllConfigValues(client);
      const listMessage = formatConfigListMessage(allConfig);

      const message = t("soracom.messages.config_updated", {
        key: inputs.config_key,
        value: inputs.config_value,
      }) + "\n\n" + listMessage;

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: message,
      });

      return {
        outputs: {
          config_key: inputs.config_key,
          config_value: inputs.config_value,
          message,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("soracom_update_config error:", errorMessage);
      return { error: errorMessage };
    }
  },
);
