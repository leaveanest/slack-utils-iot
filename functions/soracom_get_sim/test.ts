import { assertEquals } from "std/testing/asserts.ts";
import { formatSimDetailMessage } from "./mod.ts";

Deno.test({
  name: "SIM詳細が正常にフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sim = {
      simId: "8942310022000012345",
      imsi: "440101234567890",
      status: "active",
      speedClass: "s1.standard",
      tags: { name: "Device-01" },
      ipAddress: "10.0.0.1",
      subscription: "plan-D",
    };

    const message = formatSimDetailMessage(sim);

    assertEquals(message.includes("Device-01"), true);
    assertEquals(message.includes("440101234567890"), true);
    assertEquals(message.includes("active"), true);
    assertEquals(message.includes("s1.standard"), true);
    assertEquals(message.includes("10.0.0.1"), true);
    assertEquals(message.includes("plan-D"), true);
  },
});

Deno.test({
  name: "IPアドレスがないSIMは'-'を表示する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sim = {
      simId: "8942310022000012345",
      imsi: "440101234567890",
      status: "standby",
      speedClass: "s1.minimum",
      tags: {},
      ipAddress: "",
      subscription: "plan-K",
    };

    const message = formatSimDetailMessage(sim);

    assertEquals(message.includes("-"), true);
    assertEquals(message.includes("8942310022000012345"), true);
  },
});
