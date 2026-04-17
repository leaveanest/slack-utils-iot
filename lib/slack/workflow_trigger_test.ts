import { assertEquals } from "std/testing/asserts.ts";
import {
  createScheduledWorkflowTrigger,
  resolveWorkflowAppId,
} from "./workflow_trigger.ts";

Deno.test("body の api_app_id を優先して workflow_app_id を解決する", async () => {
  const apiCalls: string[] = [];
  const appId = await resolveWorkflowAppId({
    client: {
      apiCall(method) {
        apiCalls.push(method);
        return Promise.resolve({ ok: true, app_id: "A999" });
      },
    },
    body: {
      api_app_id: "A123",
    },
  });

  assertEquals(appId, "A123");
  assertEquals(apiCalls, []);
});

Deno.test("env の SLACK_APP_ID を fallback に使う", async () => {
  const apiCalls: string[] = [];
  const appId = await resolveWorkflowAppId({
    client: {
      apiCall(method) {
        apiCalls.push(method);
        return Promise.resolve({ ok: true, app_id: "A999" });
      },
    },
    env: {
      SLACK_APP_ID: "A234",
    },
  });

  assertEquals(appId, "A234");
  assertEquals(apiCalls, []);
});

Deno.test("auth.test の app_id を fallback に使う", async () => {
  const apiCalls: string[] = [];
  const appId = await resolveWorkflowAppId({
    client: {
      apiCall(method) {
        apiCalls.push(method);
        return Promise.resolve({ ok: true, app_id: "A345" });
      },
    },
  });

  assertEquals(appId, "A345");
  assertEquals(apiCalls, ["auth.test"]);
});

Deno.test("auth.test が失敗しても workflow_app_id 解決は継続できる", async () => {
  const appId = await resolveWorkflowAppId({
    client: {
      apiCall() {
        return Promise.reject(new Error("network_error"));
      },
    },
  });

  assertEquals(appId, undefined);
});

Deno.test("scheduled trigger 作成時に workflow_app_id を付与する", async () => {
  const triggerCreates: Array<Record<string, unknown>> = [];
  const response = await createScheduledWorkflowTrigger({
    client: {
      workflows: {
        triggers: {
          create(params) {
            triggerCreates.push(params);
            return Promise.resolve({
              ok: true,
              trigger: {
                id: "Ft123",
              },
            });
          },
        },
      },
    },
    workflowCallbackId: "sample_workflow",
    name: "sample",
    schedule: {
      start_time: "2026-04-17T00:00:00.000Z",
      frequency: {
        type: "once",
      },
    },
    inputs: {
      channel_id: {
        value: "C123",
      },
    },
    workflowAppId: "A456",
  });

  assertEquals(response.ok, true);
  assertEquals(triggerCreates.length, 1);
  assertEquals(triggerCreates[0]?.workflow, "#/workflows/sample_workflow");
  assertEquals(triggerCreates[0]?.workflow_app_id, "A456");
});

Deno.test("workflow_app_id 非対応環境では従来形式へフォールバックする", async () => {
  const triggerCreates: Array<Record<string, unknown>> = [];
  const response = await createScheduledWorkflowTrigger({
    client: {
      workflows: {
        triggers: {
          create(params) {
            triggerCreates.push(params);
            if (triggerCreates.length === 1) {
              return Promise.resolve({
                ok: false,
                error: "invalid_arguments",
              });
            }

            return Promise.resolve({
              ok: true,
              trigger: {
                id: "Ft124",
              },
            });
          },
        },
      },
    },
    workflowCallbackId: "sample_workflow",
    name: "sample",
    schedule: {
      start_time: "2026-04-17T00:00:00.000Z",
      frequency: {
        type: "once",
      },
    },
    inputs: {
      channel_id: {
        value: "C123",
      },
    },
    workflowAppId: "A567",
  });

  assertEquals(response.ok, true);
  assertEquals(triggerCreates.length, 2);
  assertEquals(triggerCreates[0]?.workflow_app_id, "A567");
  assertEquals(triggerCreates[1]?.workflow_app_id, undefined);
});
