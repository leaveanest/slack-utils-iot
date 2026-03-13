import { assertEquals } from "std/testing/asserts.ts";
import { formatBytes } from "./mod.ts";

Deno.test("formatBytes: 0バイトを正常にフォーマットする", () => {
  assertEquals(formatBytes(0), "0 B");
});

Deno.test("formatBytes: バイト単位を正常にフォーマットする", () => {
  assertEquals(formatBytes(500), "500.00 B");
});

Deno.test("formatBytes: KBを正常にフォーマットする", () => {
  assertEquals(formatBytes(1024), "1.00 KB");
});

Deno.test("formatBytes: MBを正常にフォーマットする", () => {
  assertEquals(formatBytes(1048576), "1.00 MB");
});

Deno.test("formatBytes: GBを正常にフォーマットする", () => {
  assertEquals(formatBytes(1073741824), "1.00 GB");
});

Deno.test("formatBytes: 小数点を含む値を正常にフォーマットする", () => {
  assertEquals(formatBytes(1536), "1.50 KB");
});
