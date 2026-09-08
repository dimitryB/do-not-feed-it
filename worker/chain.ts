/** Deliberately closed scaffold endpoints. Never attest browser-claimed scores. */
import { HEMI_CHAIN_ID } from "../lib/chain";
import type { D1Database } from "../db/chainState";
export interface ChainEnv {
  DB?: D1Database;
  HEMI_RPC_URL?: string;
  HEMI_RPC_FALLBACKS?: string;
  DNFI_CONTRACT_ADDRESS?: string;
  DNFI_VERIFIER_PRIVATE_KEY?: string;
}
export function handleChainRequest(request: Request): Response | null {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/chain/")) return null;
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (path === "/api/chain/config" && request.method === "GET") {
    return new Response(JSON.stringify({ chainId: HEMI_CHAIN_ID, enabled: false, mode: "scaffold", reason: "Mainnet recording is not implemented in this local scaffold." }), { headers });
  }
  return new Response(JSON.stringify({ error: "Chain features are not available in this scaffold." }), { status: 503, headers });
}
