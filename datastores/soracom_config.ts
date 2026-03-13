import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * Soracom設定用データストア
 *
 * チャンネルIDなどの設定値をキーバリュー形式で保存します。
 * 環境変数の代わりにSlack Datastoreで設定を管理できます。
 *
 * 使用するキー例:
 * - "alert_channel_id": SIM異常検知アラート通知先
 * - "report_channel_id": SIM通信量レポート投稿先
 * - "soracam_channel_id": ソラカメ通知投稿先
 */
const SoracomConfigDatastore = DefineDatastore({
  name: "soracom_config",
  primary_key: "config_key",
  attributes: {
    config_key: {
      type: Schema.types.string,
      description: "Configuration key (e.g., alert_channel_id)",
    },
    config_value: {
      type: Schema.types.string,
      description: "Configuration value",
    },
    updated_by: {
      type: Schema.slack.types.user_id,
      description: "User who last updated this config",
    },
    updated_at: {
      type: Schema.types.string,
      description: "Last updated timestamp (ISO 8601)",
    },
  },
});

export default SoracomConfigDatastore;
