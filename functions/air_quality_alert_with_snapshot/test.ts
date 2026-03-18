import { assertEquals } from "std/testing/asserts.ts";
import type {
  HarvestDataEntry,
  SoraCamImageExport,
} from "../../lib/soracom/mod.ts";
import {
  detectAirQualityViolations,
  findLatestAirQualityAlert,
  formatAirQualityAlertWithSnapshotMessage,
  resolveAirQualityCriteria,
} from "./mod.ts";

function createEntry(
  time: number,
  content: Record<string, unknown>,
): HarvestDataEntry {
  return {
    time,
    content,
    contentType: "application/json",
  };
}

const completedExport: SoraCamImageExport = {
  exportId: "exp-1",
  deviceId: "dev-1",
  status: "completed",
  url: "https://example.com/snapshot.jpg",
  requestedTime: Date.parse("2026-03-16T08:05:00.000Z"),
  completedTime: Date.parse("2026-03-16T08:05:05.000Z"),
};

Deno.test("既定の空気品質基準を解決できる", () => {
  const criteria = resolveAirQualityCriteria();

  assertEquals(criteria, {
    co2Max: 1000,
    temperatureMin: 18,
    temperatureMax: 28,
    humidityMin: 40,
    humidityMax: 70,
  });
});

Deno.test("サンプルの基準逸脱を検出できる", () => {
  const criteria = resolveAirQualityCriteria();
  const violations = detectAirQualityViolations(
    {
      time: Date.parse("2026-03-16T08:05:00.000Z"),
      co2: 1200,
      temperature: 29,
      humidity: 35,
    },
    criteria,
  );

  assertEquals(violations, [
    { metric: "co2", value: 1200 },
    { metric: "temperature", value: 29 },
    { metric: "humidity", value: 35 },
  ]);
});

Deno.test("最新の基準逸脱サンプルを選べる", () => {
  const criteria = resolveAirQualityCriteria();
  const alert = findLatestAirQualityAlert(
    [
      createEntry(Date.parse("2026-03-16T08:00:00.000Z"), { co2: 950 }),
      createEntry(Date.parse("2026-03-16T08:10:00.000Z"), { humidity: 72 }),
      createEntry(Date.parse("2026-03-16T08:20:00.000Z"), { temperature: 30 }),
    ],
    criteria,
  );

  assertEquals(alert?.time, Date.parse("2026-03-16T08:20:00.000Z"));
  assertEquals(alert?.violations, [{ metric: "temperature", value: 30 }]);
});

Deno.test({
  name: "空気品質アラートに画像URLを含むメッセージを生成できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const criteria = resolveAirQualityCriteria();
    const alert = findLatestAirQualityAlert(
      [
        createEntry(Date.parse("2026-03-16T08:20:00.000Z"), {
          co2: 1200,
          temperature: 29,
        }),
      ],
      criteria,
    );

    const message = formatAirQualityAlertWithSnapshotMessage(
      "440101234567890",
      "dev-1",
      alert,
      completedExport,
    );

    assertEquals(message.includes("https://example.com/snapshot.jpg"), true);
    assertEquals(message.length > 0, true);
  },
});

Deno.test({
  name: "基準逸脱がない場合は未検知メッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatAirQualityAlertWithSnapshotMessage(
      "440101234567890",
      "dev-1",
      null,
      null,
    );

    assertEquals(message.length > 0, true);
  },
});

Deno.test({
  name: "画像処理中の場合は processing メッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const criteria = resolveAirQualityCriteria();
    const alert = findLatestAirQualityAlert(
      [
        createEntry(Date.parse("2026-03-16T08:20:00.000Z"), {
          co2: 1200,
        }),
      ],
      criteria,
    );

    const message = formatAirQualityAlertWithSnapshotMessage(
      "440101234567890",
      "dev-1",
      alert,
      {
        ...completedExport,
        status: "processing",
        url: "",
      },
    );

    assertEquals(message.includes("exp-1"), true);
  },
});
