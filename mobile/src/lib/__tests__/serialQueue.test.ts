import test from "node:test";
import assert from "node:assert/strict";
import { createSerialQueue } from "../serialQueue";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("1. 3 tasks with different delays complete in the order they were added and never overlap", async () => {
  const queue = createSerialQueue();
  const completionOrder: number[] = [];
  let running = 0;
  let maxRunning = 0;

  const p1 = queue.run(async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    assert.ok(running <= 1, `Expected running <= 1, got ${running}`);
    await delay(40);
    completionOrder.push(1);
    running--;
  });

  const p2 = queue.run(async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    assert.ok(running <= 1, `Expected running <= 1, got ${running}`);
    await delay(10);
    completionOrder.push(2);
    running--;
  });

  const p3 = queue.run(async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    assert.ok(running <= 1, `Expected running <= 1, got ${running}`);
    await delay(20);
    completionOrder.push(3);
    running--;
  });

  await Promise.all([p1, p2, p3]);

  assert.deepEqual(completionOrder, [1, 2, 3]);
  assert.equal(maxRunning, 1);
  assert.equal(running, 0);
});

test("2. A task that throws rejects its own promise, and the next task still runs and resolves", async () => {
  const queue = createSerialQueue();
  const events: string[] = [];

  const p1 = queue.run(async () => {
    events.push("task1-run");
    throw new Error("boom");
  });

  const p2 = queue.run(async () => {
    events.push("task2-run");
    return "recovered";
  });

  await assert.rejects(p1, { message: "boom" });
  const res2 = await p2;

  assert.equal(res2, "recovered");
  assert.deepEqual(events, ["task1-run", "task2-run"]);
});

test("3. The return value passes through", async () => {
  const queue = createSerialQueue();

  const numResult = await queue.run(async () => 42);
  const objResult = await queue.run(async () => ({ ok: true, count: 3 }));

  assert.equal(numResult, 42);
  assert.deepEqual(objResult, { ok: true, count: 3 });
});
