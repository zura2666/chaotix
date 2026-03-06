/**
 * Client-safe validation hints for forms (market creation, username, tags, wallet).
 * Use in placeholders, help text, and client-side validation.
 */

export const IDENTIFIER_HINT = "3–32 characters: letters, numbers, _ or -";
export const USERNAME_HINT = IDENTIFIER_HINT;
export const MARKET_CANONICAL_HINT = IDENTIFIER_HINT;
export const DISPLAY_NAME_HINT = "Max 100 characters; spaces allowed";
export const TAG_HINT = "One tag per line or comma-separated; each 3–32 chars";
export const WALLET_ADDRESS_HINT = "Ethereum: 0x... (42 chars). Solana: base58 (32–44 chars).";

export const MIN_IDENTIFIER_LEN = 3;
export const MAX_IDENTIFIER_LEN = 32;
export const MAX_DISPLAY_NAME_LEN = 100;
export const MAX_TAGS = 10;
