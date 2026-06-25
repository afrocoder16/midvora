import { randomBytes } from "node:crypto";

// Unguessable URL-safe token for proposal links. 32 bytes => 256 bits of
// entropy, base64url-encoded (~43 chars). Not sequential, not derived from id.
export function generateProposalToken(): string {
  return randomBytes(32).toString("base64url");
}
