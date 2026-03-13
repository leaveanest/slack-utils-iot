import { assertEquals } from "std/testing/asserts.ts";
import { formatSimListMessage } from "./mod.ts";

Deno.test({
  name: "SIM一覧が正常にフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sims = [
      {
        simId: "8942310022000012345",
        imsi: "440101234567890",
        status: "active",
        speedClass: "s1.standard",
        tags: { name: "Device-01" },
        ipAddress: "10.0.0.1",
      },
      {
        simId: "8942310022000054321",
        imsi: "440109876543210",
        status: "suspended",
        speedClass: "s1.minimum",
        tags: { name: "Device-02" },
        ipAddress: "10.0.0.2",
      },
    ];

    const message = formatSimListMessage(sims);

    assertEquals(message.includes("Device-01"), true);
    assertEquals(message.includes("Device-02"), true);
    assertEquals(message.includes("440101234567890"), true);
    assertEquals(message.includes("active"), true);
    assertEquals(message.includes("suspended"), true);
  },
});

Deno.test({
  name: "SIM一覧が空の場合は適切なメッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatSimListMessage([]);
    assertEquals(message.length > 0, true);
  },
});

Deno.test({
  name: "タグにnameがないSIMはsimIdを表示する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sims = [
      {
        simId: "8942310022000012345",
        imsi: "440101234567890",
        status: "active",
        speedClass: "s1.standard",
        tags: {},
        ipAddress: "",
      },
    ];

    const message = formatSimListMessage(sims);
    assertEquals(message.includes("8942310022000012345"), true);
  },
});
