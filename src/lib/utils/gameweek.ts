/**
 * Gameweek utilities
 *
 * All time logic uses IST (UTC+5:30) explicitly.
 * Never use new Date().getDay() — that returns UTC day on the server,
 * which is 5.5 hours behind IST and will produce wrong staking windows
 * for Indian users (the primary audience).
 *
 * Gameweek number is weeks-since-season-start (monotonic across calendar years),
 * not ISO week number, to avoid resetting at Jan 1.
 *
 * Season: starts first Monday of June each year.
 * Staking window: Monday 00:01 IST → Saturday 23:59 IST (closed Sunday = rank lock day).
 * Rank lock: Sunday midnight IST (start of Monday).
 */

/** IST offset in milliseconds */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Return current Date expressed in IST (as a JS Date whose UTC fields read as IST) */
function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/**
 * Is the conviction staking window open?
 * Open Monday–Saturday IST. Closed Sunday IST (rank lock day).
 */
/**
 * Is the conviction staking window open?
 * Open Monday 00:00 IST → Saturday 23:59 IST.
 * Locks Saturday midnight — players must set conviction based on the week's
 * news, not on Sunday night information just before rank lock.
 * Sunday is rank lock day — conviction is frozen.
 */
export function isStakingOpen(): boolean {
  const day = nowIST().getUTCDay() // 0=Sun, 1=Mon … 6=Sat in IST
  return day >= 1 && day <= 6  // Mon–Sat open; Sun closed
}

export function isConvictionLocked(): boolean {
  return !isStakingOpen()
}

/**
 * Season string, e.g. "2025-26".
 * Indian political seasons run roughly June–June, keyed by the start year.
 * We use June 1 as the season boundary: before June = previous season.
 */
export function getCurrentSeason(): string {
  const ist  = nowIST()
  const year  = ist.getUTCFullYear()
  const month = ist.getUTCMonth() + 1 // 1-based
  // Season year = calendar year if month >= June, else previous year
  const seasonYear = month >= 6 ? year : year - 1
  return `${seasonYear}-${String(seasonYear + 1).slice(2)}`
}

/**
 * Season start date — first Monday of June for the given season year.
 */
function seasonStartDate(seasonYear: number): Date {
  // Find first Monday of June in seasonYear (UTC, midnight)
  const june1 = new Date(Date.UTC(seasonYear, 5, 1)) // June 1
  const dayOfWeek = june1.getUTCDay() // 0=Sun … 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  return new Date(june1.getTime() + daysToMonday * 86400000)
}

/**
 * Gameweek number — weeks elapsed since season start (1-indexed).
 * Monotonic across calendar year boundary; resets only when season resets (June).
 * Both this function and E6's python equivalent use the same epoch logic.
 */
export function getCurrentGameweek(): number {
  const season = getCurrentSeason()
  const seasonYear = parseInt(season.split('-')[0])
  const start = seasonStartDate(seasonYear)

  // Current Monday in IST (start of current gameweek)
  const ist    = nowIST()
  const istDay  = ist.getUTCDay()
  const daysToLastMonday = istDay === 0 ? 6 : istDay - 1
  const thisMonday = new Date(ist)
  thisMonday.setUTCDate(ist.getUTCDate() - daysToLastMonday)
  thisMonday.setUTCHours(0, 0, 0, 0)

  const weeksSinceStart = Math.floor(
    (thisMonday.getTime() - start.getTime()) / (7 * 86400000)
  )
  return Math.max(1, weeksSinceStart + 1)
}
