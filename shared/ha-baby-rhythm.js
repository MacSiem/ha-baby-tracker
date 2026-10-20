/* Canonical pure model. The declaration is embedded into the card's IIFE by
 * the owner; keep it independent of modules, DOM, browser state and imports. */
function buildBabyRhythmV53({ data = {}, now = Date.now(), timeZone = 'UTC', weekStart = 1, offset = 0 } = {}) {
  const source = data && typeof data === 'object' ? data : {};
  const validMs = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8640000000000000;
  if (!validMs(now)) throw new RangeError('now must be a finite epoch in milliseconds');
  const zone = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = stamp => {
    const values = {};
    for (const part of zone.formatToParts(new Date(stamp))) if (part.type !== 'literal') values[part.type] = Number(part.value);
    return values;
  };
  const key = date => `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const dayAt = stamp => { const p = parts(stamp); return key(new Date(Date.UTC(p.year, p.month - 1, p.day))); };
  const calendar = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && key(parsed) === value ? value : null;
  };
  const shift = (day, count) => { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return key(date); };
  // Each midnight is converted independently. Never move a local day by 24 UTC hours.
  const instant = (day, hour = 0, minute = 0, second = 0, milli = 0) => {
    const wanted = Date.parse(`${day}T00:00:00Z`) + hour * 3600000 + minute * 60000 + second * 1000 + milli;
    let candidate = wanted;
    for (let attempt = 0; attempt < 6; attempt++) {
      const p = parts(candidate);
      const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) + ((candidate % 1000) + 1000) % 1000;
      const delta = wanted - local;
      if (!delta) return candidate;
      candidate += delta;
    }
    // A skipped local wall time has no exact instant; choose the later valid
    // boundary, matching compatible calendar disambiguation on spring forward.
    const candidates = [candidate, candidate + 3600000, candidate - 3600000];
    return candidates.filter(value => {
      const p = parts(value);
      return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) >= wanted - milli;
    }).sort((a, b) => a - b)[0] ?? candidate;
  };
  const object = entry => entry !== null && typeof entry === 'object' && !Array.isArray(entry);
  const list = name => Array.isArray(source[name]) ? source[name] : [];
  const stamp = entry => {
    if (!object(entry)) return null;
    for (const field of ['timestamp', 'ts', 'startTime', 'endTime']) {
      const value = entry[field];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const normalized = Math.trunc(value) * (value < 10000000000 ? 1000 : 1);
      if (validMs(normalized)) return normalized;
    }
    const value = entry.time;
    if (typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
      const parsed = Date.parse(value);
      if (validMs(parsed)) return parsed;
    }
    return null;
  };
  const recordedDay = entry => {
    const timestamp = stamp(entry);
    return timestamp === null ? calendar(entry?.date) : dayAt(timestamp);
  };
  const minutes = value => {
    if (typeof value === 'string') {
      if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
      value = Number(value.trim().replace(',', '.'));
    }
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  };
  const links = new Set();
  const feeding = [...list('feeding'), ...list('lactation').filter(entry => entry?.type === 'breastfeed'), ...list('bf_sessions')]
    .filter(entry => {
      if (!object(entry)) return false;
      const link = entry.linkedId;
      const linked = (typeof link === 'string' || (typeof link === 'number' && Number.isFinite(link))) && Boolean(link);
      if (linked && links.has(link)) return false;
      if (linked) links.add(link);
      return true;
    }).map(entry => ({ at: stamp(entry), day: recordedDay(entry) }));
  const sleeps = list('sleep').map(entry => {
    if (!object(entry)) return { day: null, unknown: true, endpointDays: [] };
    const day = recordedDay(entry);
    if (Object.hasOwn(entry, 'startTime') || Object.hasOwn(entry, 'endTime')) {
      const from = validMs(entry.startTime) ? entry.startTime : null;
      const to = validMs(entry.endTime) ? entry.endTime : null;
      if (from === null || to === null || to < from) return { day, unknown: true,
        endpointDays: [from, to].filter(value => value !== null).map(dayAt) };
      return { day, from, to, unknown: false };
    }
    const duration = minutes(entry.duration);
    return { day, duration, unknown: duration === null, endpointDays: [] };
  });
  const union = intervals => {
    const result = [];
    intervals.sort((a, b) => a.from - b.from || a.to - b.to);
    for (const interval of intervals) {
      const last = result[result.length - 1];
      if (last && interval.from <= last.to) last.to = Math.max(last.to, interval.to);
      else result.push({ ...interval });
    }
    return result;
  };
  const today = dayAt(now);
  const summarizeDay = (day, cutoff = Infinity) => {
    const from = instant(day), to = instant(shift(day, 1));
    const end = Math.min(to, cutoff);
    const active = end > from;
    const feedings = active ? feeding.filter(entry => entry.at !== null && entry.at >= from && entry.at < end).map(entry => ({ at: entry.at })).sort((a, b) => a.at - b.at) : [];
    // Date-only intake is a daily count. A partial day cannot locate it before
    // the elapsed cutoff, so that fragment exposes only positioned records.
    const unpositionedFeeding = active && end === to ? feeding.filter(entry => entry.at === null && entry.day === day).length : 0;
    let legacyMinutes = 0, unpositionedSleep = 0, unknownSleepCount = 0;
    const intervals = [];
    for (const entry of sleeps) {
      if (!active) continue;
      if (entry.unknown) {
        if (entry.day === null || entry.day === day || entry.endpointDays.includes(day)) unknownSleepCount++;
      } else if (entry.from !== undefined) {
        const start = Math.max(from, entry.from), finish = Math.min(end, entry.to);
        if (finish > start) intervals.push({ from: start, to: finish });
      } else if (entry.day === day) {
        unpositionedSleep++;
        if (end === to) legacyMinutes += entry.duration;
        else unknownSleepCount++;
      } else if (entry.day === null) unknownSleepCount++;
    }
    const sleep = union(intervals);
    const knownSleepMinutes = legacyMinutes + sleep.reduce((sum, entry) => sum + (entry.to - entry.from) / 60000, 0);
    return { day, from, to, hours: (to - from) / 3600000, isToday: day === today, isFuture: day > today,
      feedingCount: feedings.length + unpositionedFeeding, sleepMinutes: unknownSleepCount ? null : knownSleepMinutes,
      knownSleepMinutes, unknownSleepCount, unpositionedSleep, feedings, sleep };
  };
  const totals = days => {
    const result = { feedingCount: 0, sleepMinutes: 0, knownSleepMinutes: 0, unknownSleepCount: 0, unpositionedSleep: 0 };
    for (const day of days) {
      result.feedingCount += day.feedingCount;
      result.knownSleepMinutes += day.knownSleepMinutes;
      result.unknownSleepCount += day.unknownSleepCount;
      result.unpositionedSleep += day.unpositionedSleep;
    }
    result.sleepMinutes = result.unknownSleepCount ? null : result.knownSleepMinutes;
    return result;
  };
  const startOfWeek = [0, 1, 6].includes(weekStart) ? weekStart : 1;
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const currentStart = shift(today, -((weekday - startOfWeek + 7) % 7));
  const start = shift(currentStart, (Number.isInteger(offset) ? offset : 0) * 7);
  const days = Array.from({ length: 7 }, (_, index) => summarizeDay(shift(start, index)));
  const clock = parts(now);
  const previousDay = shift(today, -7);
  const previousCutoff = instant(previousDay, clock.hour, clock.minute, clock.second, ((now % 1000) + 1000) % 1000);
  const fragment = (first, cutoff) => ({ from: instant(first), to: cutoff,
    ...totals(Array.from({ length: 7 }, (_, index) => summarizeDay(shift(first, index), cutoff))) });
  const completedDays = Array.from({ length: 7 }, (_, index) => summarizeDay(shift(today, index - 7)));
  const completed = totals(completedDays);
  const timers = source.running_timers || source._runningTimers || {};
  return { timeZone, weekStart: startOfWeek, start, end: shift(start, 6), days, totals: totals(days),
    undated: { feedingCount: feeding.filter(entry => entry.day === null).length,
      sleepCount: sleeps.filter(entry => entry.day === null && entry.from === undefined && !(entry.endpointDays || []).length).length },
    comparison: { comparable: false, reason: 'diary_coverage_unknown', current: fragment(currentStart, now), previous: fragment(shift(currentStart, -7), previousCutoff) },
    averages: { from: instant(shift(today, -7)), to: instant(today), days: 7, feedingCount: completed.feedingCount / 7,
      sleepMinutes: completed.sleepMinutes === null ? null : completed.sleepMinutes / 7,
      knownSleepMinutes: completed.knownSleepMinutes / 7, source: 'saved_records_last_7_completed_calendar_days', coverageKnown: false },
    runningTimers: { sleep: object(timers.sleep) ? { ...timers.sleep } : null, bf: object(timers.bf) ? { ...timers.bf } : null } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { buildBabyRhythmV53 };
