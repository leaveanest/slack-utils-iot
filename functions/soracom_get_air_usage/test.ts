import { assertEquals } from "std/testing/asserts.ts";
import { formatAirUsageMessage } from "./mod.ts";
import type { AirStatsDataPoint } from "../../lib/soracom/mod.ts";

Deno.test({
  name: "通信量統計が正常にフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const dataPoints: AirStatsDataPoint[] = [
      {
        date: 1700000000000,
        uploadByteSizeTotal: 1048576,
        downloadByteSizeTotal: 2097152,
        uploadPacketSizeTotal: 100,
        downloadPacketSizeTotal: 200,
      },
      {
        date: 1700086400000,
        uploadByteSizeTotal: 524288,
        downloadByteSizeTotal: 1048576,
        uploadPacketSizeTotal: 50,
        downloadPacketSizeTotal: 100,
      },
    ];

    const result = formatAirUsageMessage(
      "440101234567890",
      "day",
      dataPoints,
    );

    assertEquals(result.totalUpload, 1572864);
    assertEquals(result.totalDownload, 3145728);
    assertEquals(result.message.includes("440101234567890"), true);
  },
});

Deno.test({
  name: "データポイントが空の場合は適切なメッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = formatAirUsageMessage("440101234567890", "day", []);

    assertEquals(result.totalUpload, 0);
    assertEquals(result.totalDownload, 0);
    assertEquals(result.message.length > 0, true);
  },
});

Deno.test({
  name: "バイト数が0の場合も正常にフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const dataPoints: AirStatsDataPoint[] = [
      {
        date: 1700000000000,
        uploadByteSizeTotal: 0,
        downloadByteSizeTotal: 0,
        uploadPacketSizeTotal: 0,
        downloadPacketSizeTotal: 0,
      },
    ];

    const result = formatAirUsageMessage(
      "440101234567890",
      "month",
      dataPoints,
    );

    assertEquals(result.totalUpload, 0);
    assertEquals(result.totalDownload, 0);
    assertEquals(result.message.includes("0 B"), true);
  },
});
