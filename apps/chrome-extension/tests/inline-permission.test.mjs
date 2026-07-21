import assert from "node:assert/strict";
import { test } from "node:test";

import { SYNC_INLINE_CAPTURE_MESSAGE } from "../src/api/messages.js";
import { INLINE_CAPTURE_ORIGINS } from "../src/background/inline-registration.js";
import { createInlinePermissionController } from "../src/popup/inline-permission.js";


function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}


function expectedOrigins() {
  return { origins: [...INLINE_CAPTURE_ORIGINS] };
}


test("inline permission is off by default without requesting website access", async () => {
  const calls = [];
  const controller = createInlinePermissionController({
    permissions: {
      contains: async (details) => {
        calls.push(["contains", details]);
        return false;
      },
      request: () => {
        calls.push(["request"]);
        return Promise.resolve(true);
      },
      remove: () => {
        calls.push(["remove"]);
        return Promise.resolve(true);
      },
    },
    sendMessageImpl: async () => {
      calls.push(["sync"]);
      return { ok: true, enabled: false };
    },
  });

  assert.equal(await controller.currentEnabled(), false);
  assert.deepEqual(calls, [["contains", expectedOrigins()]]);
});


test("permission refusal returns denied without synchronizing registration", async () => {
  const calls = [];
  const controller = createInlinePermissionController({
    permissions: {
      request(details) {
        calls.push(["request", details]);
        return Promise.resolve(false);
      },
      remove() {
        throw new Error("remove should not run");
      },
      async contains(details) {
        calls.push(["contains", details]);
        return false;
      },
    },
    sendMessageImpl: async () => {
      calls.push(["sync"]);
      return { ok: true, enabled: true };
    },
  });

  const result = await controller.setEnabled(true);
  assert.deepEqual(result, { enabled: false, reason: "denied" });
  assert.deepEqual(calls, [
    ["request", expectedOrigins()],
    ["contains", expectedOrigins()],
  ]);
});


test("enable and disable request permission changes synchronously then reconcile", async () => {
  const calls = [];
  const enabledResponse = deferred();
  let expectedEnabled = true;
  const controller = createInlinePermissionController({
    permissions: {
      contains: async () => expectedEnabled,
      request(details) {
        calls.push(["request", details]);
        return enabledResponse.promise;
      },
      remove(details) {
        calls.push(["remove", details]);
        return Promise.resolve(true);
      },
    },
    sendMessageImpl: async (message) => {
      calls.push(["sync", message]);
      return { ok: true, enabled: expectedEnabled };
    },
  });

  const enabling = controller.setEnabled(true);
  assert.deepEqual(calls, [["request", expectedOrigins()]]);
  enabledResponse.resolve(true);
  assert.deepEqual(await enabling, { enabled: true, reason: "enabled" });
  assert.deepEqual(calls.at(-1), [
    "sync",
    { type: SYNC_INLINE_CAPTURE_MESSAGE },
  ]);

  expectedEnabled = false;
  const disabling = controller.setEnabled(false);
  assert.deepEqual(calls.at(-1), ["remove", expectedOrigins()]);
  assert.deepEqual(await disabling, { enabled: false, reason: "disabled" });
  assert.deepEqual(calls.at(-1), [
    "sync",
    { type: SYNC_INLINE_CAPTURE_MESSAGE },
  ]);
});


test("rapid concurrent toggle calls share one in-flight permission operation", async () => {
  const requestResult = deferred();
  let requests = 0;
  let removals = 0;
  let synchronizations = 0;
  const controller = createInlinePermissionController({
    permissions: {
      contains: async () => true,
      request() {
        requests += 1;
        return requestResult.promise;
      },
      remove() {
        removals += 1;
        return Promise.resolve(true);
      },
    },
    sendMessageImpl: async () => {
      synchronizations += 1;
      return { ok: true, enabled: true };
    },
  });

  const first = controller.setEnabled(true);
  assert.equal(requests, 1);
  const rapidSecond = controller.setEnabled(false);
  assert.equal(first, rapidSecond);
  assert.equal(requests, 1);
  assert.equal(removals, 0);

  requestResult.resolve(true);
  assert.deepEqual(await first, { enabled: true, reason: "enabled" });
  assert.deepEqual(await rapidSecond, { enabled: true, reason: "enabled" });
  assert.equal(synchronizations, 1);
});


test("a previously granted permission still reconciles when request reports no change", async () => {
  let synchronized = 0;
  const controller = createInlinePermissionController({
    permissions: {
      request: () => Promise.resolve(false),
      remove: () => Promise.resolve(false),
      contains: async () => true,
    },
    sendMessageImpl: async () => {
      synchronized += 1;
      return { ok: true, enabled: true };
    },
  });

  assert.deepEqual(await controller.setEnabled(true), {
    enabled: true,
    reason: "enabled",
  });
  assert.equal(synchronized, 1);
});


test("failed operations release the in-flight guard for a later retry", async () => {
  let requests = 0;
  const controller = createInlinePermissionController({
    permissions: {
      request() {
        requests += 1;
        return requests === 1
          ? Promise.reject(new Error("permission service stopped"))
          : Promise.resolve(true);
      },
      remove: () => Promise.resolve(true),
      contains: async () => false,
    },
    sendMessageImpl: async () => ({ ok: true, enabled: true }),
  });

  await assert.rejects(controller.setEnabled(true), /permission service stopped/);
  assert.deepEqual(await controller.setEnabled(true), {
    enabled: true,
    reason: "enabled",
  });
  assert.equal(requests, 2);
});


test("invalid reconciliation responses fail closed", async () => {
  const controller = createInlinePermissionController({
    permissions: {
      request: () => Promise.resolve(true),
      remove: () => Promise.resolve(true),
      contains: async () => true,
    },
    sendMessageImpl: async () => ({ ok: true, enabled: "yes" }),
  });

  await assert.rejects(
    controller.setEnabled(true),
    /inline_registration_failed/,
  );
});
