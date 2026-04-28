/**
 * scanner.mjs — legacy compatibility entrypoint.
 *
 * Claude-specific scanning now lives in src/harness/adapters/claude.mjs.
 */

export {
  scan,
  detectEnterpriseMcp,
  getDisabledMcpServers,
  setDisabledMcpServers,
  scanMcpPolicy,
  checkMcpPolicy,
} from "./harness/adapters/claude.mjs";
