import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { EnvironmentAndCameraDailyDigestFunctionDefinition } from "../functions/environment_and_camera_daily_digest/mod.ts";

/**
 * 環境とカメラの日次ダイジェストワークフロー
 */
const EnvironmentAndCameraDailyDigestWorkflow = DefineWorkflow({
  callback_id: "environment_and_camera_daily_digest_workflow",
  title: "環境とカメラの日次ダイジェスト",
  description: "登録済みセンサーの空気品質とカメラ活動を日次要約します",
  input_parameters: {
    properties: {},
    required: [],
  },
});

EnvironmentAndCameraDailyDigestWorkflow.addStep(
  EnvironmentAndCameraDailyDigestFunctionDefinition,
  {},
);

export default EnvironmentAndCameraDailyDigestWorkflow;
