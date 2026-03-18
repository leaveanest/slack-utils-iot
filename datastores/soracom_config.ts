import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * SORACOM設定用データストア
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
      description: "設定キー（例: alert_channel_id）",
    },
    config_value: {
      type: Schema.types.string,
      description: "設定値",
    },
    updated_by: {
      type: Schema.slack.types.user_id,
      description: "この設定を最後に更新したユーザー",
    },
    updated_at: {
      type: Schema.types.string,
      description: "最終更新日時（ISO 8601）",
    },
  },
});

export default SoracomConfigDatastore;
