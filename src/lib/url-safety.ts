import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

/**
 * Blocklists of IP ranges that must never be the target of a
 * server-initiated HTTP request. Covers loopback, link-local,
 * RFC1918 private ranges, CGNAT, multicast/reserved, cloud metadata
 * addresses, and IPv6 equivalents.
 *
 * Defense against SSRF via user-supplied URLs (webhook subscriptions,
 * future callback URLs, etc). Attacker who can't reach our internal
 * network can't use our worker as a proxy into it.
 */
const blocked4 = new BlockList();
blocked4.addSubnet("0.0.0.0", 8, "ipv4");          // "this network"
blocked4.addSubnet("10.0.0.0", 8, "ipv4");         // RFC1918
blocked4.addSubnet("100.64.0.0", 10, "ipv4");      // CGNAT
blocked4.addSubnet("127.0.0.0", 8, "ipv4");        // loopback
blocked4.addSubnet("169.254.0.0", 16, "ipv4");     // link-local (AWS/GCP metadata)
blocked4.addSubnet("172.16.0.0", 12, "ipv4");      // RFC1918
blocked4.addSubnet("192.0.0.0", 24, "ipv4");       // IETF
blocked4.addSubnet("192.0.2.0", 24, "ipv4");       // TEST-NET-1
blocked4.addSubnet("192.168.0.0", 16, "ipv4");     // RFC1918
blocked4.addSubnet("198.18.0.0", 15, "ipv4");      // benchmark
blocked4.addSubnet("198.51.100.0", 24, "ipv4");    // TEST-NET-2
blocked4.addSubnet("203.0.113.0", 24, "ipv4");     // TEST-NET-3
blocked4.addSubnet("224.0.0.0", 4, "ipv4");        // multicast
blocked4.addSubnet("240.0.0.0", 4, "ipv4");        // reserved / broadcast

const blocked6 = new BlockList();
blocked6.addAddress("::", "ipv6");                 // unspecified
blocked6.addAddress("::1", "ipv6");                // loopback
blocked6.addSubnet("::ffff:0:0", 96, "ipv6");      // IPv4-mapped
blocked6.addSubnet("fc00::", 7, "ipv6");           // unique local
blocked6.addSubnet("fe80::", 10, "ipv6");          // link-local
blocked6.addSubnet("ff00::", 8, "ipv6");           // multicast

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

/**
 * Validate that `raw` is a safe, public-facing HTTPS URL we're willing
 * to issue a server-initiated request to.
 *
 * Throws with a user-safe message on any failure:
 * - not a valid URL
 * - not HTTPS
 * - hostname is a known metadata/localhost alias
 * - hostname resolves to a private or reserved IP
 *
 * DNS rebinding note: this checks the hostname at validation time.
 * A perfectly-timed attacker could still flip DNS to a private IP
 * before delivery. That's a defense-in-depth gap to close later
 * (pin-and-connect by IP). For now, this blocks the common case of
 * a static URL pointing at internal infrastructure.
 */
export async function assertPublicHttpsUrl(raw: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("URL must use HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("URL hostname is not allowed");
  }

  let address: string;
  let family: 4 | 6;
  try {
    const r = await lookup(hostname);
    address = r.address;
    family = r.family as 4 | 6;
  } catch {
    throw new Error("URL hostname does not resolve");
  }

  const blocked = family === 4 ? blocked4 : blocked6;
  const type = family === 4 ? "ipv4" : "ipv6";
  if (blocked.check(address, type)) {
    throw new Error("URL hostname resolves to a private or reserved address");
  }
}
