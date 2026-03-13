import { assertEquals } from "std/testing/asserts.ts";
import {
  buildSimUsageSummary,
  formatUsageReportMessage,
} from "./mod.ts";
import type { AirStatsResult, SoracomSim } from "../../lib/soracom/mod.ts";
import type { SimUsageSummary } from "./mod.ts";

const baseSim: SoracomSim = {
  simId: "8942310022000012345",
  imsi: "440101234567890",
  msisdn: "09012345678",
  status: "active",
  speedClass: "s1.standard",
  tags: { name: "Device-01" },
  ipAddress: "10.0.0.1",
  createdAt: 1700000000000,
  lastModifiedAt: 1700000000000,
  groupId: "group-1",
  operatorId: "OP001",
  subscription: "plan-D",
  moduleType: "nano",
};

Deno.test({
  name: "SIM通信量サマリーが正しく生成される",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats: AirStatsResult = {
      imsi: "440101234567890",
      period: "day",
      dataPoints: [
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
      ],
    };

    const summary = buildSimUsageSummary(baseSim, stats);
    assertEquals(summary.name, "Device-01");
    assertEquals(summary.imsi, "440101234567890");
    assertEquals(summary.totalUpload, 1572864);
    assertEquals(summary.totalDownload, 3145728);
  },
});

Deno.test({
  name: "データポイントが空のSIMは通信量0になる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats: AirStatsResult = {
      imsi: "440101234567890",
      period: "day",
      dataPoints: [],
    };

    const summary = buildSimUsageSummary(baseSim, stats);
    assertEquals(summary.totalUpload, 0);
    assertEquals(summary.totalDownload, 0);
  },
});

Deno.test({
  name: "レポートメッセージが正しくフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const summaries: SimUsageSummary[] = [
      { name: "Device-01", imsi: "440101234567890", status: "active", totalUpload: 1048576, totalDownload: 2097152 },
      { name: "Device-02", imsi: "440109876543210", status: "active", totalUpload: 524288, totalDownload: 1048576 },
    ];

    const message = formatUsageReportMessage(summaries, "day");
    assertEquals(message.includes("Device-01"), true);
    assertEquals(message.includes("Device-02"), true);
  },
});

Deno.test({
  name: "SIMがない場合は適切なメッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatUsageReportMessage([], "day");
    assertEquals(message.length > 0, true);
  },
});
