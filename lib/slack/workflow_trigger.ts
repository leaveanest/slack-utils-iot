import { TriggerTypes } from "deno-slack-api/mod.ts";
import type { SlackApiClient } from "./file_upload.ts";

const INVALID_ARGUMENTS_ERROR = "invalid_arguments";

interface AuthTestResponse {
  ok: boolean;
  app_id?: string;
}

export interface WorkflowTriggerCreateResponse {
  ok: boolean;
  error?: string;
  trigger?: {
    id?: string;
  };
}

export interface WorkflowTriggerClient {
  workflows: {
    triggers: {
      create: (
        params: Record<string, unknown>,
      ) => Promise<WorkflowTriggerCreateResponse>;
    };
  };
}

export type ScheduledWorkflowTriggerInputs = Record<string, { value: string }>;

export interface ScheduledWorkflowTriggerSchedule {
  start_time: string;
  frequency: {
    type: "once";
  };
}

/**
 * Slack 関数実行コンテキストから workflow_app_id を解決します。
 */
export async function resolveWorkflowAppId(params: {
  client: SlackApiClient;
  env?: Readonly<Record<string, string>>;
  body?: unknown;
  workflowAppId?: string;
}): Promise<string | undefined> {
  const explicitAppId = normalizeString(params.workflowAppId);
  if (explicitAppId) {
    return explicitAppId;
  }

  const bodyAppId = readNestedString(params.body, ["api_app_id"]) ??
    readNestedString(params.body, ["event", "api_app_id"]) ??
    readNestedString(params.body, ["function_data", "app_id"]) ??
    readNestedString(params.body, ["event", "function_data", "app_id"]);
  if (bodyAppId) {
    return bodyAppId;
  }

  const envAppId = normalizeString(params.env?.SLACK_APP_ID);
  if (envAppId) {
    return envAppId;
  }

  try {
    const response = await params.client.apiCall(
      "auth.test",
    ) as AuthTestResponse;
    return response.ok ? normalizeString(response.app_id) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * workflow_app_id を使って scheduled trigger を作成します。
 */
export async function createScheduledWorkflowTrigger(params: {
  client: WorkflowTriggerClient;
  workflowCallbackId: string;
  name: string;
  schedule: ScheduledWorkflowTriggerSchedule;
  inputs: ScheduledWorkflowTriggerInputs;
  workflowAppId?: string;
}): Promise<WorkflowTriggerCreateResponse> {
  const baseRequest: Record<string, unknown> = {
    type: TriggerTypes.Scheduled,
    name: params.name,
    workflow: buildWorkflowPath(params.workflowCallbackId),
    schedule: params.schedule,
    inputs: params.inputs,
  };

  const workflowAppId = normalizeString(params.workflowAppId);
  if (workflowAppId) {
    const response = await params.client.workflows.triggers.create({
      ...baseRequest,
      workflow_app_id: workflowAppId,
    });
    if (response.ok || response.error !== INVALID_ARGUMENTS_ERROR) {
      return response;
    }
  }

  return await params.client.workflows.triggers.create(baseRequest);
}

function buildWorkflowPath(workflowCallbackId: string): string {
  return `#/workflows/${workflowCallbackId}`;
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNestedString(
  value: unknown,
  path: string[],
): string | undefined {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return normalizeString(current);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
