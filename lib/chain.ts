/** Adapted from POP's Hemi configuration and domain-bound signed result flow. */
import { defineChain, hashTypedData, keccak256, parseAbi, stringToHex, type Address, type Hex } from "viem";
import { GAME_VERSION_LABEL } from "./game/config.ts";

export const HEMI_CHAIN_ID = 43_111;
export const HEMI_RPC_URL = "https://rpc.hemi.network/rpc";
export const HEMI_EXPLORER_URL = "https://explorer.hemi.xyz";
export const GAME_VERSION = keccak256(stringToHex(GAME_VERSION_LABEL));
export const hemiChain = defineChain({ id: HEMI_CHAIN_ID, name: "Hemi Mainnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [HEMI_RPC_URL] } }, blockExplorers: { default: { name: "Hemi Explorer", url: HEMI_EXPLORER_URL } } });
export const resultTypes = {
  RunResult: [
    { name: "runId", type: "bytes32" }, { name: "gameVersion", type: "bytes32" },
    { name: "player", type: "address" }, { name: "score", type: "uint64" },
    { name: "durationTicks", type: "uint32" }, { name: "totalFeeds", type: "uint32" },
    { name: "correctFeeds", type: "uint32" }, { name: "mutationEvents", type: "uint32" },
    { name: "seed", type: "bytes32" }, { name: "traceHash", type: "bytes32" },
    { name: "snapshotHash", type: "bytes32" }, { name: "deadline", type: "uint64" },
  ],
} as const;
export interface SignedRunResult {
  runId: Hex; gameVersion: Hex; player: Address; score: bigint;
  durationTicks: number; totalFeeds: number; correctFeeds: number; mutationEvents: number;
  seed: Hex; traceHash: Hex; snapshotHash: Hex; deadline: bigint;
}
export function resultTypedData(result: SignedRunResult, verifyingContract: Address, chainId = HEMI_CHAIN_ID) {
  return { domain: { name: "Do Not Feed It", version: "0", chainId, verifyingContract }, types: resultTypes, primaryType: "RunResult" as const, message: result };
}
export function attestationTypedData(result: SignedRunResult, verifyingContract: Address, chainId = HEMI_CHAIN_ID) {
  return { domain: { name: "Do Not Feed It", version: "0", chainId, verifyingContract }, types: { VerifierAttestation: [{ name: "resultHash", type: "bytes32" }] }, primaryType: "VerifierAttestation" as const, message: { resultHash: hashTypedData(resultTypedData(result, verifyingContract, chainId)) } };
}
export const feedRegistryAbi = parseAbi([
  "function submitResult((bytes32 runId,bytes32 gameVersion,address player,uint64 score,uint32 durationTicks,uint32 totalFeeds,uint32 correctFeeds,uint32 mutationEvents,bytes32 seed,bytes32 traceHash,bytes32 snapshotHash,uint64 deadline) result,bytes playerSignature,bytes verifierSignature)",
  "function bestScore(address player) view returns (uint64)",
  "function usedRunIds(bytes32 runId) view returns (bool)",
]);
