import assert from "node:assert/strict";
import test from "node:test";
import { CreateProfileReportBody } from "@workspace/api-zod";

const validReport = {
  username: "otheruser",
  reason: "spam",
  details: "โปรไฟล์นี้แสดงลิงก์หลอกลวง",
};

test("profile reports require a written reason", () => {
  assert.equal(CreateProfileReportBody.safeParse(validReport).success, true);
  assert.equal(
    CreateProfileReportBody.safeParse({
      username: validReport.username,
      reason: validReport.reason,
    }).success,
    false,
  );
});

test("profile report reasons cannot be blank or whitespace-only", () => {
  for (const details of ["", "   ", "\n\t"]) {
    assert.equal(
      CreateProfileReportBody.safeParse({ ...validReport, details }).success,
      false,
    );
  }
});
