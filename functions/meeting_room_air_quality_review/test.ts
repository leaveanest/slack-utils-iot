import { assertEquals } from "std/testing/asserts.ts";
import type {
  AirQualityBucketSummary,
  AirQualitySummary,
} from "../../lib/soracom/mod.ts";
import { formatMeetingRoomAirQualityReviewMessage } from "./mod.ts";

const summaryWithData: AirQualitySummary = {
  sampleCount: 18,
  co2: {
    latest: 920,
    min: 640,
    max: 1320,
    average: 905.3,
  },
  temperature: {
    latest: 24.4,
    min: 21.8,
    max: 25.1,
    average: 23.3,
  },
  humidity: {
    latest: 50,
    min: 42,
    max: 56,
    average: 48.2,
  },
  criteria: {
    co2Max: 1000,
    temperatureMin: 18,
    temperatureMax: 28,
    humidityMin: 40,
    humidityMax: 70,
  },
  co2Threshold: 1000,
  co2ThresholdExceededCount: 4,
  temperatureRange: {
    min: 18,
    max: 28,
  },
  temperatureOutOfRangeCount: 1,
  humidityRange: {
    min: 40,
    max: 70,
  },
  humidityOutOfRangeCount: 0,
};

const peakBucket: AirQualityBucketSummary = {
  startTime: Date.parse("2026-03-16T01:00:00.000Z"),
  endTime: Date.parse("2026-03-16T02:00:00.000Z"),
  summary: {
    sampleCount: 4,
    co2: {
      latest: 1300,
      min: 1200,
      max: 1350,
      average: 1275,
    },
    temperature: {},
    humidity: {},
    criteria: {
      co2Max: 1000,
      temperatureMin: 18,
      temperatureMax: 28,
      humidityMin: 40,
      humidityMax: 70,
    },
    co2Threshold: 1000,
    co2ThresholdExceededCount: 4,
    temperatureRange: {
      min: 18,
      max: 28,
    },
    temperatureOutOfRangeCount: 1,
    humidityRange: {
      min: 40,
      max: 70,
    },
    humidityOutOfRangeCount: 0,
  },
};

Deno.test({
  name: "会議室空気品質振り返りメッセージが正しくフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatMeetingRoomAirQualityReviewMessage(
      "440101234567890",
      summaryWithData,
      peakBucket,
    );

    assertEquals(message.includes("440101234567890"), true);
    assertEquals(message.includes("1275"), true);
    assertEquals(message.includes("2026-03-16T01:00:00.000Z"), true);
    assertEquals(
      message.includes("air_quality_humidity_violation_count") ||
        (message.includes("40") && message.includes("70")),
      true,
    );
  },
});

Deno.test({
  name: "データがない場合は空データ用メッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatMeetingRoomAirQualityReviewMessage(
      "440101234567890",
      {
        ...summaryWithData,
        sampleCount: 0,
        co2: {},
        temperature: {},
        humidity: {},
        co2ThresholdExceededCount: 0,
        temperatureOutOfRangeCount: 0,
        humidityOutOfRangeCount: 0,
      },
      null,
    );

    assertEquals(message.includes("440101234567890"), true);
    assertEquals(message.length > 0, true);
  },
});
