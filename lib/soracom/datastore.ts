/**
 * Soracom設定データストアヘルパー
 *
 * Slack Datastoreから設定値を読み込むユーティリティ関数を提供します。
 * Datastoreに値がない場合は環境変数にフォールバックします。
 *
 * @example
 * ```typescript
 * const channelId = await getConfigValue(client, "alert_channel_id", "SORACOM_ALERT_CHANNEL_ID");
 * ```
 */

import { t } from "../i18n/mod.ts";
import SoracomConfigDatastore from "../../datastores/soracom_config.ts";

/** Slack APIクライアントの型（datastoreアクセス用） */
interface DatastoreClient {
  apps: {
    datastore: {
      get: (params: {
        datastore: string;
        id: string;
      }) => Promise<{
        ok: boolean;
        item?: { config_value?: string };
        error?: string;
      }>;
      put: (params: {
        datastore: string;
        item: Record<string, unknown>;
      }) => Promise<{ ok: boolean; error?: string }>;
      query: (params: {
        datastore: string;
      }) => Promise<{
        ok: boolean;
        items?: Array<Record<string, string>>;
        error?: string;
      }>;
    };
  };
}

/** 設定キー定義 */
export const CONFIG_KEYS = {
  ALERT_CHANNEL_ID: "alert_channel_id",
  REPORT_CHANNEL_ID: "report_channel_id",
  SORACAM_CHANNEL_ID: "soracam_channel_id",
} as const;

/** 設定キーと環境変数のマッピング */
const ENV_FALLBACK_MAP: Record<string, string> = {
  [CONFIG_KEYS.ALERT_CHANNEL_ID]: "SORACOM_ALERT_CHANNEL_ID",
  [CONFIG_KEYS.REPORT_CHANNEL_ID]: "SORACOM_REPORT_CHANNEL_ID",
  [CONFIG_KEYS.SORACAM_CHANNEL_ID]: "SORACOM_SORACAM_CHANNEL_ID",
};

/**
 * Datastoreから設定値を取得します（環境変数フォールバック付き）
 *
 * 優先順位:
 * 1. Datastoreの値
 * 2. 機能別の環境変数
 * 3. 共通の環境変数（SORACOM_DEFAULT_CHANNEL_ID）
 * 4. フォールバック値
 *
 * @param client - Slack APIクライアント
 * @param configKey - 設定キー
 * @param fallback - フォールバック値
 * @returns 設定値
 */
export async function getConfigValue(
  client: DatastoreClient,
  configKey: string,
  fallback = "C0000000000",
): Promise<string> {
  try {
    const result = await client.apps.datastore.get({
      datastore: SoracomConfigDatastore.definition.name,
      id: configKey,
    });

    if (result.ok && result.item?.config_value) {
      return result.item.config_value;
    }
  } catch (error) {
    console.warn(
      t("soracom.logs.datastore_read_fallback", {
        key: configKey,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  // 環境変数フォールバック
  const envKey = ENV_FALLBACK_MAP[configKey];
  if (envKey) {
    const envValue = Deno.env.get(envKey);
    if (envValue) return envValue;
  }

  const defaultValue = Deno.env.get("SORACOM_DEFAULT_CHANNEL_ID");
  if (defaultValue) return defaultValue;

  return fallback;
}

/**
 * Datastoreに設定値を保存します
 *
 * @param client - Slack APIクライアント
 * @param configKey - 設定キー
 * @param configValue - 設定値
 * @param userId - 更新者のユーザーID
 * @throws {Error} 保存に失敗した場合
 */
export async function setConfigValue(
  client: DatastoreClient,
  configKey: string,
  configValue: string,
  userId: string,
): Promise<void> {
  const result = await client.apps.datastore.put({
    datastore: SoracomConfigDatastore.definition.name,
    item: {
      config_key: configKey,
      config_value: configValue,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    throw new Error(
      t("soracom.errors.datastore_write_failed", {
        key: configKey,
        error: result.error ?? "unknown_error",
      }),
    );
  }
}

/**
 * Datastoreから全設定を取得します
 *
 * @param client - Slack APIクライアント
 * @returns 設定キーと値のマップ
 */
export async function getAllConfigValues(
  client: DatastoreClient,
): Promise<Record<string, string>> {
  const result = await client.apps.datastore.query({
    datastore: SoracomConfigDatastore.definition.name,
  });

  if (!result.ok || !result.items) {
    return {};
  }

  const config: Record<string, string> = {};
  for (const item of result.items) {
    if (item.config_key && item.config_value) {
      config[item.config_key] = item.config_value;
    }
  }
  return config;
}
