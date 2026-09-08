import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, stringToHex } from "viem";
import { network } from "hardhat";
import { GAME_VERSION, attestationTypedData, resultTypedData, type SignedRunResult } from "../lib/chain.ts";

describe("FeedRegistry V0 foundation", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  async function fixture() {
    const [owner, verifier, player, relayer, impostor] = await viem.getWalletClients();
    const registry = await viem.deployContract("FeedRegistry", [owner.account.address, verifier.account.address, GAME_VERSION]);
    const result: SignedRunResult = {
      runId: keccak256(stringToHex("fixture-run")), gameVersion: GAME_VERSION, player: player.account.address,
      score: 1000n, durationTicks: 600, totalFeeds: 10, correctFeeds: 8, mutationEvents: 2,
      seed: keccak256(stringToHex("seed")), traceHash: keccak256(stringToHex("trace")),
      snapshotHash: keccak256(stringToHex("practice-snapshot")), deadline: BigInt(await networkHelpers.time.latest()) + 600n,
    };
    const chainId = await publicClient.getChainId();
    async function signatures(value = result, signer = player, domainChain = chainId) {
      return [await signer.signTypedData(resultTypedData(value, registry.address, domainChain)), await verifier.signTypedData(attestationTypedData(value, registry.address, domainChain))] as const;
    }
    return { owner, verifier, player, relayer, impostor, registry, result, signatures, chainId };
  }
  it("accepts a result sent by a relayer and rejects its duplicate", async () => {
    const f = await fixture(); const signatures = await f.signatures();
    await f.registry.write.submitResult([f.result, ...signatures], { account: f.relayer.account });
    assert.equal(await f.registry.read.bestScore([f.player.account.address]), 1000n);
    await assert.rejects(f.registry.write.submitResult([f.result, ...signatures], { account: f.relayer.account }));
  });
  it("rejects forged player signatures and signatures for another chain", async () => {
    const f = await fixture();
    await assert.rejects(f.registry.write.submitResult([f.result, ...await f.signatures(f.result, f.impostor)]));
    await assert.rejects(f.registry.write.submitResult([f.result, ...await f.signatures(f.result, f.player, f.chainId + 1)]));
    assert.equal(await f.registry.read.usedRunIds([f.result.runId]), false);
  });
  it("rejects results outside the scaffold's reachable score and timing bounds", async () => {
    const f = await fixture();
    for (const result of [{ ...f.result, score: 50000n }, { ...f.result, durationTicks: 0 }, { ...f.result, mutationEvents: 10 }, { ...f.result, deadline: 0n }]) {
      await assert.rejects(f.registry.write.submitResult([result, ...await f.signatures(result)]));
    }
  });
  it("pausing is owner-controlled and blocks an otherwise valid result", async () => {
    const f = await fixture();
    await assert.rejects(f.registry.write.pause([], { account: f.player.account }));
    await f.registry.write.pause();
    await assert.rejects(f.registry.write.submitResult([f.result, ...await f.signatures()]));
    await f.registry.write.unpause();
    await f.registry.write.submitResult([f.result, ...await f.signatures()]);
  });
});
