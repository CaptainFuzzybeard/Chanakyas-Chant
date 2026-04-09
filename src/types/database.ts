/**
 * types/database.ts
 *
 * TypeScript types mirroring the Supabase schema.
 * In production these would be generated with: supabase gen types typescript
 * For now they are hand-written to match migrations 002–004 exactly.
 *
 * Naming convention: types match table names in PascalCase.
 * Joins are expressed as nested types (Row & { relation: RelationRow }).
 */

// ──────────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────────

export type OfficeStatus    = 'in_office' | 'opposition' | 'former'
export type PoliticianTier  = 'national' | 'state' | 'both'
export type ElectionType    = 'lok_sabha' | 'vidhan_sabha' | 'rajya_sabha' | 'by_election'
export type ElectionResult  = 'won' | 'lost' | 'withdrew'
export type PipelineStatus  = 'ingested' | 'attributed' | 'scored' | 'applied' | 'skipped'
export type LeagueType      = 'public' | 'private'
export type LeagueScope     = 'national' | 'state'
export type CabinetScope    = 'national' | 'state'
export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_annual'
export type EventType       =
  | 'news_score' | 'election_result' | 'defection_penalty'
  | 'penalty_decay' | 'dispute_hold' | 'dispute_release' | 'manual_correction'
export type StatAffected    =
  | 'infrastructure' | 'healthcare' | 'education'
  | 'jobs_economy' | 'approval' | 'vote_share'
  | 'penalty_scam' | 'penalty_bias' | 'composite'
export type DeltaDirection  = 'positive' | 'negative' | 'neutral'
export type CabinetPosition =
  | 'pm_cm' | 'finance' | 'home' | 'health' | 'education'
  | 'women_child' | 'infrastructure' | 'agriculture'
  | 'external_affairs' | 'commerce' | 'environment' | 'law' | 'bench'
export type DefectionReason =
  | 'election' | 'defection' | 'merger' | 'expulsion' | 'initial'

// ──────────────────────────────────────────────────────────────────────────
// Domain 1: World State
// ──────────────────────────────────────────────────────────────────────────

export interface Party {
  id:           string
  eci_party_id: string
  name:         string
  abbreviation: string | null
  alliance:     string | null
  symbol_url:   string | null
  founded_year: number | null
  is_national:  boolean
  updated_at:   string
}

export interface Politician {
  id:                 string
  eci_candidate_id:   string
  current_party_id:   string
  name:               string
  name_aliases:       string[]
  portrait_url:       string | null
  constituency:       string | null
  state:              string
  tier:               PoliticianTier
  office_status:      OfficeStatus
  gender:             string | null
  date_of_birth:      string | null
  terms_served:       number | null
  education:          string | null
  profile_bio:        string | null   // AI-generated summary — null until backfill runs
  created_at:         string
  updated_at:         string
}

export interface PoliticianStats {
  politician_id:          string
  composite_score:        number
  composite_delta_7d:     number | null
  score_infrastructure:   number | null
  score_healthcare:       number | null
  score_education:        number | null
  score_jobs_economy:     number | null
  score_approval:         number | null
  score_vote_share:       number | null
  penalty_scam:           number
  penalty_bias:           number
  tag_sycophancy:         boolean
  tag_scam_cloud:         boolean
  tag_bias:               boolean
  tag_disputed:           boolean
  tag_defected:           boolean
  tag_rising:             boolean
  score_frozen_until:     string | null
  sentiment_hold_pct:     number | null
  last_scored_at:         string
}

export interface ElectionResultRow {
  id:               string
  politician_id:    string
  election_type:    ElectionType
  election_year:    number
  constituency:     string
  state:            string
  votes_received:   number | null
  total_votes_cast: number | null
  vote_share_pct:   number | null
  result:           ElectionResult
  margin:           number | null
}

export interface NewsItem {
  id:              string
  url:             string
  content_hash:    string | null
  source_domain:   string
  source_tier:     number
  headline:        string
  published_at:    string
  ingested_at:     string
  pipeline_status: PipelineStatus
  skipped_reason:  string | null
}

// ──────────────────────────────────────────────────────────────────────────
// Domain 2: User State
// ──────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:                      string
  username:                string | null
  party_name:              string
  subscription_tier:       SubscriptionTier
  subscription_expires_at: string | null
  razorpay_customer_id:    string | null
  onboarding_complete:     boolean
  created_at:              string
}

export interface Cabinet {
  id:                      string
  user_id:                 string
  scope:                   CabinetScope
  scope_state:             string | null
  cabinet_score:           number
  cabinet_score_prev_week: number | null
  is_active:               boolean
  created_at:              string
}

export interface RosterSlot {
  id:                   string
  cabinet_id:           string
  politician_id:        string
  party_at_draft_id:    string
  cabinet_position:     CabinetPosition | null
  position_multiplier:  number
  drafted_at:           string
  position_assigned_at: string | null
  is_active:            boolean
  dropped_at:           string | null
}

export interface League {
  id:          string
  name:        string
  league_type: LeagueType
  scope:       LeagueScope
  scope_state: string | null
  invite_code: string | null
  created_by:  string | null
  max_members: number | null
  season:      number
  created_at:  string
}

export interface LeagueMembership {
  id:           string
  league_id:    string
  cabinet_id:   string
  current_rank: number | null
  rank_delta:   number
  joined_at:    string
}

// ──────────────────────────────────────────────────────────────────────────
// Domain 3: Event Log
// ──────────────────────────────────────────────────────────────────────────

export interface NewsItemAttribution {
  id:            string
  news_item_id:  string
  politician_id: string
  confidence:    number
  match_method:  string
  matched_text:  string | null
  party_context: string | null
  created_at:    string
}

export interface ScoreEvent {
  id:                         string
  politician_id:              string
  news_item_id:               string | null
  event_type:                 EventType
  stat_affected:              StatAffected
  delta:                      number
  score_before:               number
  score_after:                number
  source_tier:                number | null
  corroborating_source_count: number
  impact_engine_reasoning:    string | null
  applied_at:                 string
  was_frozen:                 boolean
}

export interface TickerEvent {
  id:               string
  politician_id:    string
  score_event_id:   string | null
  ticker_text:      string
  delta_direction:  DeltaDirection
  is_event_trigger: boolean
  created_at:       string
  expires_at:       string | null
}

// ──────────────────────────────────────────────────────────────────────────
// RPC return types (from migration 005)
// ──────────────────────────────────────────────────────────────────────────

export interface CardNewsTrailItem {
  event_id:                   string
  stat_affected:              StatAffected
  event_type:                 string | null
  delta:                      number
  source_tier:                number
  reasoning:                  string | null
  corroborating_source_count: number | null
  headline:                   string | null
  source_domain:              string | null
  source_url:                 string | null
  applied_at:                 string
}

export interface CabinetRankingRow {
  rank:           number
  rank_delta:     number
  user_id:        string
  party_name:     string
  cabinet_score:  number
  cabinet_id:     string
}

export interface PoliticianSentiment {
  hold_pct:           number
  defection_drop_pct: number | null
  total_holders:      number
}

// ──────────────────────────────────────────────────────────────────────────
// Composite / joined types used by the frontend
// ──────────────────────────────────────────────────────────────────────────

/** Full politician card data — politician + stats + party */
export interface PoliticianCard {
  politician: Politician
  stats:      PoliticianStats
  party:      Party
}

/** Roster slot enriched with politician and party data */
export interface RosterSlotEnriched extends RosterSlot {
  politician:    Politician
  stats:         PoliticianStats
  party:         Party
  draft_party:   Party   // party_at_draft_id → Party
}

/** Cabinet with all 12 enriched slots */
export interface CabinetEnriched extends Cabinet {
  slots: RosterSlotEnriched[]
}

/** Position multiplier constants — mirrors CABINET_POSITION_ANCHORS in config.py */
export const POSITION_MULTIPLIERS: Record<CabinetPosition, number> = {
  pm_cm:           1.5,
  finance:         1.2,  // if economy is top stat
  home:            1.0,
  health:          1.2,  // if healthcare is top stat
  education:       1.0,
  women_child:     1.2,  // dual anchor: healthcare + education
  infrastructure:  1.0,
  agriculture:     1.0,
  external_affairs:1.0,
  commerce:        1.0,
  environment:     1.0,
  law:             1.0,
  bench:           1.0,
}

export const POSITION_LABELS: Record<CabinetPosition, string> = {
  pm_cm:           'PM / CM',
  finance:         'Finance',
  home:            'Home Affairs',
  health:          'Health & Family',
  education:       'Education',
  women_child:     'Women & Child',
  infrastructure:  'Infrastructure',
  agriculture:     'Agriculture',
  external_affairs:'External Affairs',
  commerce:        'Commerce',
  environment:     'Environment',
  law:             'Law & Justice',
  bench:           'Bench',
}

export const POSITION_ANCHOR_STATS: Record<CabinetPosition, StatAffected[]> = {
  pm_cm:           ['composite'],
  finance:         ['jobs_economy'],
  home:            ['approval'],
  health:          ['healthcare'],
  education:       ['education'],
  women_child:     ['healthcare', 'education'],
  infrastructure:  ['infrastructure'],
  agriculture:     ['jobs_economy'],
  external_affairs:['approval'],
  commerce:        ['jobs_economy'],
  environment:     ['infrastructure'],
  law:             ['penalty_scam'],
  bench:           [],
}

/** All 12 positions in display order */
export const CABINET_POSITIONS: CabinetPosition[] = [
  'pm_cm', 'finance', 'home', 'health', 'education', 'women_child',
  'infrastructure', 'agriculture', 'external_affairs', 'commerce',
  'environment', 'law',
]

/** Returned by get_weekly_movers RPC (migration 011) */
export interface WeeklyMoverRow {
  politician_id:      string
  name:               string
  party_abbreviation: string | null
  state:              string
  constituency:       string | null
  portrait_url:       string | null
  composite_score:    number
  composite_delta_7d: number
  tag_rising:         boolean
  tag_scam_cloud:     boolean
  tag_defected:       boolean
}

// ── Coalition types (migration 014) ──────────────────────────────────────────

export type CoalitionStatus = 'pending' | 'active' | 'dissolved' | 'declined'

export interface Coalition {
  id:                      string
  name:                    string
  proposer_cabinet_id:     string
  acceptor_cabinet_id:     string | null
  status:                  CoalitionStatus
  coalition_score:         number
  coalition_score_prev_week: number | null
  league_id:               string
  proposed_at:             string
  accepted_at:             string | null
  dissolved_at:            string | null
  dissolves_at_rank_lock:  boolean
  dissolution_requested_by: string | null
}

export interface CoalitionLeaderboardRow {
  rank:            number
  coalition_id:    string
  coalition_name:  string
  party_1_name:    string
  party_2_name:    string
  coalition_score: number
  rank_delta:      number
}

export interface MyCoalition {
  coalition_id:           string
  coalition_name:         string
  status:                 CoalitionStatus
  partner_party:          string | null
  coalition_score:        number
  proposed_at:            string
  accepted_at:            string | null
  dissolves_at_rank_lock: boolean
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSCIENCE LAYER — Migration 015
// ══════════════════════════════════════════════════════════════════════════════

export type ConvictionLevel = 'doubt' | 'cautious' | 'neutral' | 'believe' | 'certain'

export const CONVICTION_LEVELS: {
  value: ConvictionLevel
  label: string
  multiplierUp: number   // applied when politician scores positively that week
  multiplierDown: number // applied when politician scores negatively that week
  color: string
  fillPct: number        // visual fill 0–100 for the bar
}[] = [
  { value: 'doubt',    label: 'Doubt',    multiplierUp: 0.6, multiplierDown: 1.4, color: 'var(--red)',    fillPct: 0   },
  { value: 'cautious', label: 'Cautious', multiplierUp: 0.8, multiplierDown: 1.2, color: 'var(--t3)',    fillPct: 25  },
  { value: 'neutral',  label: 'Neutral',  multiplierUp: 1.0, multiplierDown: 1.0, color: 'var(--t2)',    fillPct: 50  },
  { value: 'believe',  label: 'Believe',  multiplierUp: 1.3, multiplierDown: 0.8, color: 'var(--amber)', fillPct: 75  },
  { value: 'certain',  label: 'Certain',  multiplierUp: 1.6, multiplierDown: 0.6, color: 'var(--green)', fillPct: 100 },
]

export const DEFAULT_CONVICTION: ConvictionLevel = 'neutral'

export type ArthashastraTheme =
  | 'power' | 'governance' | 'treasury' | 'war_and_peace'
  | 'counsel' | 'kings_conduct' | 'people_and_state'
  | 'justice' | 'espionage' | 'time'

export type IndicatorType =
  | 'cpi_inflation' | 'unemployment_rate' | 'agricultural_output'
  | 'industrial_output' | 'fiscal_deficit_pct'

export interface ConvictionStakeRow {
  id:             string
  user_id:        string
  politician_id:  string
  gameweek:       number
  season:         string
  conviction:     ConvictionLevel
  resolved:       boolean
  actual_score:   number | null
  was_correct:    boolean | null
  score_modifier: number | null
  created_at:     string
  updated_at:     string
}

export interface ConvictionCalibration {
  id:                string
  user_id:           string
  season:            string
  total_stakes:      number
  high_stakes:       number
  high_correct:      number
  medium_stakes:     number
  medium_correct:    number
  low_stakes:        number
  low_correct:       number
  calibration_score: number
  overconfident:     boolean
  herd_score:        number
  updated_at:        string
}

export interface ConvictionHerd {
  id:            string
  politician_id: string
  gameweek:      number
  season:        string
  total_stakes:  number
  high_pct:      number
  medium_pct:    number
  low_pct:       number
  updated_at:    string
}

export interface SlowBurnIndicator {
  id:           string
  indicator:    IndicatorType
  period_month: number
  period_year:  number
  value:        number
  prev_value:   number | null
  delta_pct:    number | null
  source_url:   string | null
  created_at:   string
}

export interface SlowBurnDelta {
  id:            string
  news_item_id:  string
  politician_id: string
  indicator:     IndicatorType
  indicator_id:  string | null
  delta:         number
  news_date:     string
  apply_after:   string
  applied:       boolean
  applied_at:    string | null
  created_at:    string
}

export interface ArthashastraQuote {
  id:         string
  quote:      string
  book:       string
  theme:      ArthashastraTheme
  news_tags:  string[]
  created_at: string
}

export interface GameweekQuote {
  id:             string
  gameweek:       number
  season:         string
  quote_id:       string
  dominant_theme: ArthashastraTheme | null
  created_at:     string
}

export interface CabinetAudit {
  id:                       string
  user_id:                  string
  season:                   string
  gender_breakdown:         Record<string, number>
  region_breakdown:         Record<string, number>
  constituency_breakdown:   Record<string, number>
  education_breakdown:      Record<string, number>
  avg_tenure_years:         number
  avg_age:                  number
  is_regionally_diverse:    boolean
  is_gender_balanced:       boolean
  is_experience_balanced:   boolean
  is_urban_heavy:           boolean
  created_at:               string
}

export interface ReckoningPortrait {
  id:                     string
  user_id:                string
  season:                 string
  total_score:            number | null
  league_rank:            number | null
  league_percentile:      number | null
  calibration_score:      number | null
  overconfident:          boolean | null
  herd_score:             number | null
  conviction_narrative:   string | null
  audit_id:               string | null
  composition_narrative:  string | null
  slow_burn_total:        number | null
  slow_burn_narrative:    string | null
  season_quote_id:        string | null
  archetype:              string | null
  archetype_description:  string | null
  raw_data:               Record<string, unknown> | null
  generated_at:           string
}

// Politician profile extension fields (added by migration 015)
export interface PoliticianProfileExtension {
  gender:            'male' | 'female' | 'other' | 'unknown'
  state:             string | null
  region:            string | null
  constituency_type: 'urban' | 'semi_urban' | 'rural'
  education_level:   'below_matric' | 'matric' | 'graduate' | 'postgraduate' | 'doctorate' | 'unknown'
  tenure_years:      number
  first_elected:     number | null
  age_at_election:   number | null
}
