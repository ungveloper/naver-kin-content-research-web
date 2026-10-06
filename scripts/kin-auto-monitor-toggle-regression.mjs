import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(
  ".github/workflows/kin-life-guide-monitor.yml",
  "utf8",
);

assert.match(
  workflow,
  /github\.event_name\s*==\s*'workflow_dispatch'\s*\|\|\s*vars\.KIN_AUTO_MONITOR_ENABLED\s*==\s*'true'/,
);

assert.doesNotMatch(
  workflow,
  /vars\.KIN_AUTO_MONITOR_ENABLED\s*==\s*''/,
);

assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /kin-life-guide-monitor\.mjs/);
assert.match(workflow, /cancel-in-progress:\s*false/);
assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON/);

console.log(
  "자동 monitor 스위치 회귀 테스트 통과: "
  + "exact true만 cron 허용 + false/미설정 fail-closed + 수동 실행 유지",
);
