// Cross-venue execution across four prediction exchanges, in one place.
//
// The venues are Kalshi, Polymarket, Novig and ProphetX. Every listing is a
// binary contract paying $1 if the outcome happens, so a price is a
// probability and the whole question reduces to: what true probability do I
// need for this buy to break even *here*?
//
// Two fee shapes, not interchangeable:
//
//   on_winnings  commission on profit only; a loss costs nothing.
//                Novig (0.06 live, 0 pregame), ProphetX (0.02-0.03).
//   on_notional  c*p*(1-p) charged on every fill, win or lose.
//                Kalshi (0.07), Polymarket sports taker (0.05).
//
// For a buy at p, break-even probability is
//   on_winnings  p / (p + (1-p)(1-f))
//   on_notional  p + c*p*(1-p)
//
// A sell of X at b is a buy of NOT-X at (1-b), so
//   p_be_buy(A, ask_a) + p_be_buy(B, 1 - bid_b) < 1
// is locked profit once both fills happen.
//
// This file mirrors the Rust crate in Projects/qs-odds (src/venue.rs). Keep
// the fee table and the arb conditions identical in both; a divergence between
// the terminal and the website is a phantom edge on one of them.

export type Venue = 'kalshi' | 'polymarket' | 'novig' | 'prophetx';

export const VENUES: Venue[] = ['kalshi', 'polymarket', 'novig', 'prophetx'];

export interface VenueFee {
  kind: 'on_winnings' | 'on_notional' | 'unpriced';
  rate: number;
  makerCredit: number;
  liveOnly: boolean;
}

export const FEES: Record<Venue, VenueFee> = {
  // Catalog publishes charged=WHEN_LIVE, coefficient 0.06, makerCredit 0.25.
  novig: { kind: 'on_winnings', rate: 0.06, makerCredit: 0.25, liveOnly: true },
  // Community/affiliate tier is 2% of NET WINNINGS, nothing on a loss. At -105
  // that is ~1.05% of stake, the cheapest of the four whenever the bet wins.
  prophetx: { kind: 'on_winnings', rate: 0.02, makerCredit: 0, liveOnly: false },
  kalshi: { kind: 'on_notional', rate: 0.07, makerCredit: 0, liveOnly: false },
  // Sports taker 0.05; makers pay nothing.
  polymarket: { kind: 'on_notional', rate: 0.05, makerCredit: 1, liveOnly: false },
};

export function effectiveFee(v: Venue, live: boolean, maker: boolean): number | null {
  const f = FEES[v];
  if (f.kind === 'unpriced') return null;
  if (f.liveOnly && !live) return 0;
  return maker ? f.rate * (1 - f.makerCredit) : f.rate;
}

/** True probability at which a buy at `price` is exactly break-even. */
export function breakevenBuy(price: number, v: Venue, live = false, maker = false): number | null {
  if (!(price > 0 && price < 1)) return null;
  const r = effectiveFee(v, live, maker);
  if (r === null) return null;
  const f = FEES[v];
  if (f.kind === 'on_winnings') {
    return r <= 0 ? price : price / (price + (1 - price) * (1 - r));
  }
  return price + r * price * (1 - price);
}

/** Break-even probability for laying X at `price`: buy NOT-X at 1 - price. */
export function breakevenSell(price: number, v: Venue, live = false, maker = false): number | null {
  const no = breakevenBuy(1 - price, v, live, maker);
  return no === null ? null : 1 - no;
}

/** One venue's view of one outcome. */
export interface Row {
  venue: Venue;
  /** "ML" | "SPREAD" | "TOTAL" */
  family: string;
  /** Date-pinned game key, e.g. "2026-11-09|PHI|GB". */
  event: string;
  /** Squad or selection, e.g. "GB". */
  side: string;
  /** Handicap as the favourite sees it. null for moneyline. */
  line: number | null;
  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;
  live: boolean;
  /** What the price is a claim on, when it is not "this side covers this number".
   *  Kalshi and Polymarket list spread rungs as "wins by over 6.5"; buying that
   *  is a bet on a MARGIN BAND, not on covering a -6.5 line at a sportsbook
   *  price. Comparing the two manufactured a 5-point fake arb on 2026-11-15.
   *  Unset means the plain cover claim. */
  claim?: 'cover' | 'margin';
  /** What kind of resting order this quote came from. An exchange catalog that
   *  omits `book` gives a consensus mark, not a book side: that price is not
   *  executable, so it must never be treated as an ask you can hit or a bid you
   *  can lay against. Unset means a real two-sided book. */
  quoteKind?: 'book' | 'mark';
  /** Unix seconds when this quote was read. */
  seenAt: number;
}

function rowKey(r: Row): string {
  const line = r.line === null ? '' : String(Math.round(r.line * 10));
  // The claim has to be in the key. Pooling a margin band with a cover price
  // on the same team and number is how a fake 5-point edge appears.
  const claim = r.claim ?? 'cover';
  return `${r.event}|${r.family}|${r.side}|${line}|${claim}`;
}

export interface Arb {
  event: string;
  family: string;
  side: string;
  line: number | null;
  buyVenue: Venue;
  buyPrice: number;
  sellVenue: Venue;
  sellPrice: number;
  /** Guaranteed profit per $1 of contract, after both fees. */
  locked: number;
  /** Contracts fillable on both legs from visible size. */
  size: number;
  /** Absolute dollars locked at that size. */
  dollars: number;
}

/** Above this, assume the quote is wrong rather than the market. Two exchanges
 *  pricing the same binary rarely disagree by even 5 points; a wider gap means a
 *  different game state, a different settlement rule, or a stale/replay price.
 *  Measured 2026-11-08: every gap over 5 points traced to a data bug, not an edge. */
export const IMPLAUSIBLE_GAP = 0.05;

export interface ScanOpts {
  maxAgeS: number;
  minEdge: number;
  minSize: number;
}

export const DEFAULT_OPTS: ScanOpts = { maxAgeS: 180, minEdge: 0.005, minSize: 1 };

function comparable(r: Row, now: number, opts: ScanOpts): boolean {
  if (now - r.seenAt > opts.maxAgeS) return false;
  if (r.quoteKind === 'mark') return false;
  return FEES[r.venue].kind !== 'unpriced';
}

/** Find locked cross-venue trades. Each outcome is keyed by event, family,
 *  side and line; every ordered pair of venues is tested within a key. */
export function findArbs(rows: Row[], now: number, opts: ScanOpts = DEFAULT_OPTS): Arb[] {
  // Collapse to one row per (outcome, venue) first. A feed can repeat the same
  // market across pages; left alone, every duplicate pairs with every other
  // duplicate and the same trade is reported six times with six different sizes.
  const best = new Map<string, Row>();
  for (const r of rows) {
    if (!comparable(r, now, opts)) continue;
    const k = `${rowKey(r)}|${r.venue}`;
    const prev = best.get(k);
    if (!prev) {
      best.set(k, { ...r });
      continue;
    }
    const ask = prev.ask === null ? r.ask : r.ask === null ? prev.ask : Math.min(prev.ask, r.ask);
    const bid = prev.bid === null ? r.bid : r.bid === null ? prev.bid : Math.max(prev.bid, r.bid);
    const askSize = ask === r.ask ? r.askSize : prev.askSize;
    const bidSize = bid === r.bid ? r.bidSize : prev.bidSize;
    best.set(k, { ...prev, ask, bid, askSize, bidSize });
  }

  const groups = new Map<string, Row[]>();
  for (const r of best.values()) {
    const k = rowKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }

  const out: Arb[] = [];
  for (const g of groups.values()) {
    for (const a of g) {
      if (a.ask === null) continue;
      const cost = breakevenBuy(a.ask, a.venue, a.live);
      if (cost === null) continue;
      for (const b of g) {
        if (a.venue === b.venue || b.bid === null) continue;
        // A pregame bid cannot close a live buy: they describe different games.
        if (a.live !== b.live) continue;
        const leg2 = breakevenBuy(1 - b.bid, b.venue, b.live);
        if (leg2 === null) continue;
        const locked = 1 - (cost + leg2);
        if (locked < opts.minEdge) continue;
        // Laying at b pays at most (1 - b); more than that is arithmetic, not profit.
        if (locked > 1 - b.bid + 1e-9) continue;
        if (locked > IMPLAUSIBLE_GAP) continue;
        const size = Math.min(a.askSize ?? 0, b.bidSize ?? 0);
        if (size < opts.minSize) continue;
        out.push({
          event: a.event,
          family: a.family,
          side: a.side,
          line: a.line,
          buyVenue: a.venue,
          buyPrice: a.ask,
          sellVenue: b.venue,
          sellPrice: b.bid,
          locked,
          size,
          dollars: locked * size,
        });
      }
    }
  }
  return out.sort((x, y) => y.locked - x.locked);
}

export interface VenueQuote {
  venue: Venue;
  bid: number | null;
  ask: number | null;
}

export interface ComparisonRow {
  event: string;
  family: string;
  side: string;
  line: number | null;
  /** Every venue that prices this exact outcome, cheapest ask first. */
  venues: VenueQuote[];
  /** Best executable buy across venues, after that venue's fee. */
  bestBuy: { venue: Venue; price: number; cost: number } | null;
  /** Best executable lay across venues, after that venue's fee. */
  bestLay: { venue: Venue; price: number; cost: number } | null;
  /** bestLay.cost - bestBuy.cost: positive means the round trip is locked. */
  gap: number | null;
  size: number;
}

/** Every outcome that more than one venue prices, with the best buy and the best
 *  lay side by side. This is the screen findArbs cannot be: when no trade locks,
 *  it still shows which venue is cheap and by how much, which is what a
 *  line-shopper needs. Only 'cover' claims compare. */
export function compare(
  rows: Row[],
  now: number,
  maxAgeS = 180,
  includeBands = false,
): ComparisonRow[] {
  const byVenue = new Map<string, Map<Venue, Row>>();
  for (const r of rows) {
    if (now - r.seenAt > maxAgeS) continue;
    if (FEES[r.venue].kind === 'unpriced') continue;
    if (r.quoteKind === 'mark') continue;
    if (r.bid === null && r.ask === null) continue;
    if (!includeBands && r.claim && r.claim !== 'cover') continue;
    const k = `${rowKey(r)}|${r.claim ?? 'cover'}`;
    const m = byVenue.get(k);
    if (m) m.set(r.venue, r);
    else byVenue.set(k, new Map([[r.venue, r]]));
  }

  const out: ComparisonRow[] = [];
  for (const [k, per] of byVenue) {
    if (per.size < 2) continue;
    const sample = per.values().next().value as Row;
    const venues: VenueQuote[] = [];
    // Cheapest ask overall, cheapest bid overall, each after its own venue's fee.
    let bestBuy: ComparisonRow['bestBuy'] = null;
    let bestLay: ComparisonRow['bestLay'] = null;
    let buySize = 0;
    let laySize = 0;
    for (const r of per.values()) {
      venues.push({ venue: r.venue, bid: r.bid, ask: r.ask });
      if (r.ask !== null) {
        const cost = breakevenBuy(r.ask, r.venue, r.live);
        if (cost !== null && (!bestBuy || cost < bestBuy.cost)) {
          bestBuy = { venue: r.venue, price: r.ask, cost };
          buySize = r.askSize ?? 0;
        }
      }
      if (r.bid !== null) {
        const cost = breakevenBuy(1 - r.bid, r.venue, r.live);
        if (cost !== null && (!bestLay || cost < bestLay.cost)) {
          bestLay = { venue: r.venue, price: r.bid, cost };
          laySize = r.bidSize ?? 0;
        }
      }
    }
    // A round trip needs two DIFFERENT venues. Buying in a marketplace and laying
    // the same contract back into that same marketplace is not a cross-venue trade,
    // it is paying its spread; and one venue's ask can never be under its own bid.
    const crossed = Boolean(
      bestBuy && bestLay && bestBuy.venue !== bestLay.venue && bestLay.cost > bestBuy.cost,
    );
    const size = crossed ? Math.min(buySize, laySize) : 0;
    venues.sort((a, b) => (a.ask ?? 1) - (b.ask ?? 1));
    out.push({
      event: sample.event,
      family: sample.family,
      side: sample.side,
      line: sample.line,
      venues,
      bestBuy,
      bestLay,
      gap: crossed && bestBuy && bestLay ? bestLay.cost - bestBuy.cost : null,
      size,
    });
    void k;
  }
  return out.sort((a, b) => (b.gap ?? -9) - (a.gap ?? -9));
}

export interface Quote {
  venue: Venue;
  event: string;
  family: string;
  side: string;
  line: number | null;
  fair: number;
  bid: number | null;
  ask: number | null;
  edgeBid: number | null;
  edgeAsk: number | null;
}

function tick(x: number): number {
  return Math.round(x * 100) / 100;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** Consensus fair value per outcome: the median two-sided mid across venues.
 *  A single venue's mid is that venue's opinion; the median is the market's. */
/** Median across venues of whatever price you pass. `side: 'maker'` uses the
 *  mid (what we would post around); `side: 'taker'` uses the cheaper of
 *  mid and each venue's own ask, because a spread nobody is on cannot be
 *  crossed — a market with no bid has mid == ask, which is not a fair value. */
export function consensus(
  rows: Row[],
  now: number,
  maxAgeS = 180,
  side: 'maker' | 'taker' = 'maker',
): Map<string, number> {
  const mids = new Map<string, number[]>();
  for (const r of rows) {
    if (now - r.seenAt > maxAgeS) continue;
    const mid = r.bid !== null && r.ask !== null ? (r.bid + r.ask) / 2 : r.ask ?? r.bid;
    if (mid === null) continue;
    const price = side === 'taker' && r.ask !== null ? Math.min(mid, r.ask) : mid;
    const k = rowKey(r);
    const arr = mids.get(k);
    if (arr) arr.push(price);
    else mids.set(k, [price]);
  }
  const fair = new Map<string, number>();
  for (const [k, v] of mids) fair.set(k, median(v));
  return fair;
}

export interface QuoteSheet {
  venue: Venue;
  event: string;
  family: string;
  side: string;
  line: number | null;
  fair: number;
  bid: number | null;
  ask: number | null;
  /** Half the touch, gross of fee, in dollars per contract. */
  edgeBid: number | null;
  edgeAsk: number | null;
}

/** Where can we post a bid below and an ask above fair without crossing the
 *  venue's own resting book? `halfSpread` is in dollars per contract; the
 *  returned bid/ask are the price we would post, not the venue's. */
export function quoteSheet(rows: Row[], now: number, halfSpread: number): QuoteSheet[] {
  // Makers should not post around a price that no venue would actually trade at,
  // so the fair used for posting is the taker consensus (mid, capped by each ask).
  const fair = consensus(rows, now, 180, 'taker');
  const out: QuoteSheet[] = [];
  for (const r of rows) {
    const f = fair.get(rowKey(r));
    if (f === undefined) continue;
    const wantBid = f - halfSpread;
    const wantAsk = f + halfSpread;
    let bid: number | null = wantBid > 0.01 && wantBid < 0.99 ? tick(wantBid) : null;
    let ask: number | null = wantAsk > 0.01 && wantAsk < 0.99 ? tick(wantAsk) : null;
    // A maker bid above the venue's own ask would cross and fill as a taker at
    // a worse price. Same for an ask below the bid.
    if (bid !== null && r.ask !== null && bid >= r.ask) bid = null;
    if (ask !== null && r.bid !== null && ask <= r.bid) ask = null;
    out.push({
      venue: r.venue,
      event: r.event,
      family: r.family,
      side: r.side,
      line: r.line,
      fair: f,
      bid,
      ask,
      edgeBid: bid === null ? null : f - bid,
      edgeAsk: ask === null ? null : ask - f,
    });
  }
  return out;
}

/** Where the same claim is cheaper on one venue than the fair price the rest of
 *  the market is showing. This is not an arb: it is a value bet, and it only
 *  becomes a locked trade when you can lay the other side elsewhere.
 *  `edge` is (fair - ask) / fair, i.e. how much of fair you are paying. */
export interface ValueBet {
  venue: Venue;
  event: string;
  family: string;
  side: string;
  line: number | null;
  ask: number;
  askSize: number | null;
  fair: number;
  edge: number;
  /** Break-even probability for this buy after this venue's fee. */
  breakeven: number;
}

export function valueBets(rows: Row[], now: number, minEdge = 0.02, minVenues = 3): ValueBet[] {
  const fair = consensus(rows, now, 180, 'taker');
  const out: ValueBet[] = [];
  // Fair value here is the median of ONE-SIDED venue bids, and a single exchange's
  // resting bid is often far from where the market clears: Novig shows KC +4.5 bid
  // 0.375 against Polymarket's own ladder. Without a floor on how many venues price
  // the same claim, that produced a 36% "edge" that was one stale bid, not value.
  const priced = new Map<string, number>();
  for (const r of rows) {
    if (now - r.seenAt > 180) continue;
    if (r.bid === null && r.ask === null) continue;
    priced.set(rowKey(r), (priced.get(rowKey(r)) ?? 0) + 1);
  }
  for (const r of rows) {
    if (r.ask === null || !(r.ask > 0 && r.ask < 1)) continue;
    const k = rowKey(r);
    if ((priced.get(k) ?? 0) < minVenues) continue;
    const f = fair.get(k);
    if (f === undefined || !(f > 0)) continue;
    const edge = (f - r.ask) / f;
    if (edge < minEdge) continue;
    const be = breakevenBuy(r.ask, r.venue, r.live);
    if (be === null || be >= f) continue;
    out.push({
      venue: r.venue,
      event: r.event,
      family: r.family,
      side: r.side,
      line: r.line,
      ask: r.ask,
      askSize: r.askSize,
      fair: f,
      edge,
      breakeven: be,
    });
  }
  return out.sort((a, b) => b.edge - a.edge);
}

/** Worst-case guaranteed profit from a two-sided maker fill at bid/ask. */
export function twoSidedCapture(bid: number, ask: number, v: Venue, live = false): number | null {
  const r = effectiveFee(v, live, true);
  if (r === null) return null;
  const f = FEES[v];
  const spread = ask - bid;
  // Worst case is the outcome resolving YES: the bid leg pays (1-bid) net of
  // commission, the ask leg owes (1-ask). Everything else nets the spread.
  if (f.kind === 'on_winnings') return spread - r * (1 - bid);
  return spread - r * (bid * (1 - bid) + ask * (1 - ask));
}

/** Capital needed to hold both legs of an arb to settlement, and the return. */
export function capitalFor(a: Arb): { outlay: number; profit: number; roi: number } {
  // Buy a.side at buyPrice (pay buyPrice), lay it at sellPrice by buying the
  // complement (pay 1 - sellPrice). Exactly one leg settles at $1.
  const outlay = (a.buyPrice + (1 - a.sellPrice)) * a.size;
  const profit = a.locked * a.size;
  return { outlay, profit, roi: outlay > 0 ? profit / outlay : 0 };
}
