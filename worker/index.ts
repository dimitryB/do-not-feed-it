/** POP's Workers routing pattern, adapted to the local DNFI scaffold. */
import handler from "vinext/server/app-router-entry";
import { handleChainRequest, type ChainEnv } from "./chain";
interface Env extends ChainEnv { ASSETS: { fetch(request: Request): Promise<Response> } }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void }
const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const chainResponse = handleChainRequest(request);
    return chainResponse ?? handler.fetch(request, env, ctx);
  },
};
export default worker;
