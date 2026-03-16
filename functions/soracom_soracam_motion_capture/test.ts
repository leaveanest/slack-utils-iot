import { assertEquals } from "std/testing/asserts.ts";
import { filterMotionEvents, formatMotionCaptureMessage } from "./mod.ts";
import type {
  SoraCamEvent,
  SoraCamImageExport,
} from "../../lib/soracom/mod.ts";

Deno.test({
  name: "モーションイベントが正しくフィルタされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const events: SoraCamEvent[] = [
      {
        deviceId: "dev-1",
        eventType: "motion",
        eventTime: 1700000000000,
        eventInfo: {},
      },
      {
        deviceId: "dev-1",
        eventType: "sound",
        eventTime: 1700001000000,
        eventInfo: {},
      },
      {
        deviceId: "dev-1",
        eventType: "person",
        eventTime: 1700002000000,
        eventInfo: {},
      },
      {
        deviceId: "dev-1",
        eventType: "motion",
        eventTime: 1700003000000,
        eventInfo: {},
      },
    ];

    const motionEvents = filterMotionEvents(events);
    assertEquals(motionEvents.length, 3);
    assertEquals(motionEvents[0].eventType, "motion");
    assertEquals(motionEvents[1].eventType, "person");
    assertEquals(motionEvents[2].eventType, "motion");
  },
});

Deno.test({
  name: "モーションイベントがない場合は空配列を返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const events: SoraCamEvent[] = [
      {
        deviceId: "dev-1",
        eventType: "sound",
        eventTime: 1700001000000,
        eventInfo: {},
      },
    ];

    const motionEvents = filterMotionEvents(events);
    assertEquals(motionEvents.length, 0);
  },
});

Deno.test({
  name: "完了した画像エクスポートのメッセージにURLが含まれる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const motionEvents: SoraCamEvent[] = [
      {
        deviceId: "dev-1",
        eventType: "motion",
        eventTime: 1700000000000,
        eventInfo: {},
      },
    ];

    const exports: SoraCamImageExport[] = [
      {
        exportId: "exp-1",
        deviceId: "dev-1",
        status: "completed",
        url: "https://example.com/image1.jpg",
        requestedTime: 1700000000000,
        completedTime: 1700000005000,
      },
    ];

    const message = formatMotionCaptureMessage("dev-1", motionEvents, exports);
    assertEquals(message.includes("https://example.com/image1.jpg"), true);
    assertEquals(message.includes(":camera:"), true);
  },
});

Deno.test({
  name: "イベントがない場合は検出なしメッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatMotionCaptureMessage("dev-1", [], []);
    assertEquals(message.length > 0, true);
  },
});
