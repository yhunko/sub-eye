import { describe, expect, it } from "bun:test";
import { createSettleBarrier } from "./settle-barrier";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createSettleBarrier", () => {
  it("resolves immediately when nothing is in flight", async () => {
    const barrier = createSettleBarrier();
    let done = false;
    await barrier.settled().then(() => {
      done = true;
    });
    expect(done).toBe(true);
  });

  // The whole point: a reader must not observe the world mid-rebuild.
  it("waits for a tracked writer", async () => {
    const barrier = createSettleBarrier();
    const work = deferred();
    barrier.track(work.promise);

    let settled = false;
    void barrier.settled().then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    work.resolve();
    await barrier.settled();
    expect(settled).toBe(true);
  });

  // A second sync starting while the reader is already waiting is exactly the
  // foreground race. Returning after only the first would sample the second
  // run's cancel-all window.
  it("keeps waiting when a new writer starts mid-wait", async () => {
    const barrier = createSettleBarrier();
    const first = deferred();
    const second = deferred();
    barrier.track(first.promise);

    let settled = false;
    void barrier.settled().then(() => {
      settled = true;
    });

    barrier.track(second.promise);
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    second.resolve();
    await barrier.settled();
    expect(settled).toBe(true);
  });

  // A failed sync must not wedge every future reader.
  it("settles after a writer rejects", async () => {
    const barrier = createSettleBarrier();
    const work = deferred();
    // Caller owns the rejection; the barrier only needs to stop blocking.
    barrier.track(work.promise).catch(() => undefined);

    work.reject(new Error("scheduling failed"));
    await barrier.settled();
    expect(true).toBe(true);
  });
});
