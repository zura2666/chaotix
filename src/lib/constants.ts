export const TRADING_FEE_BPS = 100; // 1% = 100 bps
export const REFERRER_FEE_BPS = 50; // 50% of fee to referrer
export const PLATFORM_FEE_BPS = 50;

// AMM liquidity pool — automatic liquidity seeding from treasury (prevents infinite slippage, dead markets)
export const INITIAL_POOL_TOKENS = 10_000;
export const INITIAL_POOL_SHARES = 10_000;
export const INITIAL_POOL_TOKENS_LEGACY = 1000;
export const INITIAL_POOL_SHARES_LEGACY = 100_000; // legacy: initial price 0.01 (no longer used for new markets)

// Trade limits
export const MIN_TRADE_AMOUNT = 1;
export const MIN_TRADE_SHARES = 0.01;
export const MAX_TRADE_AMOUNT = 1_000_000;
/** Early-stage: max trade size (cost or proceeds) per single trade. */
export const MAX_TRADE_SIZE = 50_000;
/** Early-stage: max number of trades per user per calendar day (anti-abuse). */
export const MAX_DAILY_TRADES = 100;
export const TRADE_RATE_LIMIT_PER_MINUTE = 30;
export const PUBLIC_API_RATE_LIMIT_PER_MINUTE = 120;
export const PORTFOLIO_FEED_RATE_LIMIT_PER_MINUTE = 60;
export const FOLLOW_COPY_TRADE_RATE_LIMIT_PER_MINUTE = 30;
export const LIQUIDITY_RATE_LIMIT_PER_MINUTE = 20;

// Market creation
export const MIN_INITIAL_BUY_TO_ACTIVATE = 5;
export const MARKET_CREATION_COOLDOWN_MS = 60 * 1000; // 1 min
export const MAX_NEW_MARKETS_PER_USER_PER_HOUR = 5;
export const MIN_HEALTH_SCORE_FOR_TRENDING = 1;

// Market phases: creation | discovery | active | dormant
export const MARKET_PHASE_CREATION = "creation";
export const MARKET_PHASE_DISCOVERY = "discovery";
export const MARKET_PHASE_ACTIVE = "active";
export const MARKET_PHASE_DORMANT = "dormant";

// Dormant: no trade for this many ms
export const DORMANT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Circuit breaker: if price moves more than this in one trade, pause market
export const CIRCUIT_BREAKER_PCT = 50;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 min

// Max price impact per single trade (slippage cap)
export const MAX_PRICE_IMPACT_BPS = 1000; // 10%

// Large trade dampening: effective cap on impact
export const LARGE_TRADE_DAMPENING_FACTOR = 0.5;

// Share precision (avoid float drift)
export const SHARE_PRECISION = 6;

// Whale protection
export const MAX_POSITION_PCT_OF_SUPPLY = 0.25;
export const MAX_TRADE_PCT_OF_LIQUIDITY = 0.15;
export const MIN_LIQUIDITY_FOR_LARGE_TRADE = 500;

// Market archive
export const ARCHIVE_NO_TRADE_DAYS = 60;
export const ARCHIVE_MIN_LIQUIDITY = 50;
export const ARCHIVE_MIN_ACTIVITY_SCORE = 0.5;
export const MARKET_STATUS_ACTIVE = "active";
export const MARKET_STATUS_INACTIVE = "inactive";
export const MARKET_STATUS_ARCHIVED = "archived";

// Progressive friction: market creation limits by trust level
export const DEFAULT_MARKET_CREATION_LIMIT = 5;
export const MAX_MARKET_CREATION_LIMIT = 20;
export const TRUST_LEVEL_FOR_MAX_LIMIT = 10;

// Asset type (abstraction for future token/onchain)
export type AssetType = "mock" | "token" | "onchain";
export const CURRENT_ASSET_TYPE: AssetType = "mock";

// Early market advantage
export const EARLY_TRADER_LIMIT = 50;
export const EARLY_TRADER_FEE_DISCOUNT_BPS = 500; // 5% discount = 95 bps of 100

// Market merge / similarity
export const CONCEPT_SIMILARITY_THRESHOLD = 0.85;
export const CONCEPT_HASH_NORMALIZE_REGEX = /[@#\s]+/g;

// LP fee share to LPs (of trading fee). Phase 6: 50% platform/referrer, 25% LP pool, 25% treasury
export const LP_FEE_BPS = 25; // 25% of fee to LPs
export const TREASURY_FEE_BPS = 25; // 25% to treasury (rest is platform/referrer)
export const PLATFORM_REFERRER_FEE_BPS = 50; // 50% to platform + referrer split

// Market creation cost (spam prevention)
export const MARKET_CREATION_FEE = 1;
export const MARKET_CREATION_REFUND_TRADES = 50;
export const MARKET_CREATION_REFUND_UNIQUE_TRADERS = 20;

// Anti-manipulation
export const SUSPICIOUS_DRAIN_PCT = 40; // sell >40% of pool in one trade
export const SUSPICIOUS_PRICE_SPIKE_PCT = 300; // price change >300% in 5 min
export const SUSPICIOUS_FREEZE_MINUTES = 5;

// Phase 7: Risk engine
export const MAX_POSITION_PCT_OF_SUPPLY_RISK = 0.25; // max single position as share of supply
export const MAX_DAILY_LOSS_PCT = 0.2; // 20% of portfolio value
export const MAX_MARKET_EXPOSURE_PCT = 0.5; // max value in single market vs total portfolio

// Phase 7: Creator economy (incentive system)
export const CREATOR_FEE_SHARE_PCT = 10; // 10% of platform fees from their market
export const CREATOR_MILESTONE_TRADES = [100, 500, 1000] as const;
export const CREATOR_MILESTONE_VOLUME = 10_000; // volume milestone
export const CREATOR_MILESTONE_BONUS = 5; // balance reward per milestone
export const CREATOR_MILESTONE_REPUTATION = 5; // reputation increase per milestone

// Phase 7: Market lifecycle stages
export const MARKET_STAGE_EMERGING = "emerging";
export const MARKET_STAGE_ACTIVE = "active";
export const MARKET_STAGE_ESTABLISHED = "established";
export const MARKET_STAGE_LEGENDARY = "legendary";
export const MARKET_STAGE_DEAD = "dead";
export const STAGE_ACTIVE_TRADERS = 10;
export const STAGE_ESTABLISHED_TRADERS = 100;
export const STAGE_LEGENDARY_REPUTATION = 80;
export const STAGE_DEAD_DAYS = 30;

// Attention signal window (ms)
export const ATTENTION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Chaos protection: adaptive creation
export const BASE_MARKET_CREATION_COOLDOWN_MS = 60 * 1000;
export const MAX_MARKET_CREATION_COOLDOWN_MS = 10 * 60 * 1000;
export const PLATFORM_GROWTH_COOLDOWN_FACTOR = 1.5;

// Closed beta
export const BETA_REQUIRE_INVITE_TO_TRADE = true;
export const WAITLIST_STATUS_NONE = "none";
export const WAITLIST_STATUS_WAITLISTED = "waitlisted";
export const WAITLIST_STATUS_INVITED = "invited";
export const WAITLIST_STATUS_ACTIVE = "active";

// Founding traders
export const FOUNDING_TRADER_CAP = 500;
export const FOUNDING_TRADER_FEE_BPS = 50;   // 0.5% for founding traders

// Market gravity
export const GRAVITY_THRESHOLD = 0.4;         // narrative GravityScore in [0,1]; above this: homepage + discovery + highlight

// Public launch: when enabled, no invite required; discovery/viral/gravity amplification on
export const PUBLIC_LAUNCH_MODE =
  process.env.PUBLIC_LAUNCH_MODE === "true" || process.env.PUBLIC_LAUNCH_MODE === "1";

// Market creation governance: min reputation, proposals, upvotes, alias-based duplicate prevention
// Process: user proposes market → community upvotes → if threshold reached → market created (aliases prevent duplicates)
// Early-stage: governance proposals disabled (featureFlag "future"); direct create for all.
export const MIN_REPUTATION_TO_PROPOSE = 0; // min rep to submit a proposal
export const MIN_REPUTATION_TO_CREATE_DIRECT = 0; // early-stage: direct create for all; set to 5 when governance proposals enabled
export const PROPOSAL_UPVOTE_THRESHOLD = 5; // upvotes needed to auto-create market

// Curated narratives: when true, only admins can create markets; discovery shows core OR volume >= threshold
export const CURATED_NARRATIVE_MODE = true;
// Discovery only shows core markets OR volume above this
export const DISCOVERY_VOLUME_THRESHOLD = 100; // non-core markets need volume >= this to appear in discovery
