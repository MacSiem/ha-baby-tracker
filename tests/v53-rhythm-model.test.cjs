'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBabyRhythmV53 } = require('../shared/ha-baby-rhythm.js');
const ms = value => Date.parse(value);
const interval = (from, to, extra = {}) => ({ startTime: ms(from), endTime: ms(to), ...extra });
const options = { now: ms('2026-10-20T12:00:00+02:00'), timeZone: 'Europe/Warsaw', weekStart: 1, offset: 0 };
const model = (data = {}, extra = {}) => buildBabyRhythmV53({ ...options, data, ...extra });
const day = (result, key) => result.days.find(item => item.day === key);

test('HA calendar rather than host calendar determines midnight and seven daily buckets', () => {
  const result = model({ feeding: [{ timestamp: ms('2026-10-19T22:30:00Z'), date: '2026-10-19' }] });
  assert.deepEqual(result.days.map(item => item.day), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.equal(day(result, '2026-10-19').feedingCount, 0);
  assert.equal(day(result, '2026-10-20').feedingCount, 1);
  assert.equal(day(result, '2026-10-20').from, ms('2026-10-20T00:00:00+02:00'));
  assert.equal(day(result, '2026-10-20').isToday, true);
  assert.equal(day(result, '2026-10-21').isFuture, true);
  const elsewhere = model({}, { timeZone: 'America/Los_Angeles', now: ms('2026-10-19T00:30:00Z') });
  assert.equal(elsewhere.days[0].day, '2026-10-12');
  assert.equal(day(elsewhere, '2026-10-18').isToday, true);
});

test('Sunday, Monday and Saturday week starts and previous offset use local dates', () => {
  assert.equal(model({}, { weekStart: 0 }).days[0].day, '2026-10-18');
  assert.equal(model({}, { weekStart: 6 }).days[0].day, '2026-10-17');
  assert.equal(model({}, { offset: -1 }).days[0].day, '2026-10-12');
});

test('feeding sources deduplicate explicit links only and exclude pumping', () => {
  const timestamp = options.now - 60000;
  const result = model({ feeding: [{ timestamp, linkedId: 'pair' }, { timestamp, id: 'same' }, { timestamp, id: 'same' }],
    lactation: [{ ts: timestamp, type: 'breastfeed', linkedId: 'pair' }, { ts: timestamp, type: 'breastfeed' }, { ts: timestamp, type: 'pump' }],
    bf_sessions: [{ timestamp }, { timestamp, linkedId: 'pair' }] });
  assert.equal(day(result, '2026-10-20').feedingCount, 5);
  assert.equal(day(result, '2026-10-20').feedings.length, 5);
  assert.equal(result.totals.feedingCount, 5);
});

test('legacy epoch seconds and aware ISO clocks work; date-only records have no invented position', () => {
  const result = model({ feeding: [{ timestamp: ms('2026-10-20T09:00:00+02:00') / 1000 },
    { time: '2026-10-20T10:00:00+02:00' }, { date: '2026-10-20', time: '08:30' },
    { time: '2026-10-20T09:00:00' }, { timestamp: true }, { date: '2026-02-30' }] });
  const selected = day(result, '2026-10-20');
  assert.equal(selected.feedingCount, 3);
  assert.deepEqual(selected.feedings.map(item => item.at), [ms('2026-10-20T09:00:00+02:00'), ms('2026-10-20T10:00:00+02:00')]);
  assert.equal(result.undated.feedingCount, 3);
});

test('saved sleep intervals clip at midnight, preserve exact minutes and union overlaps', () => {
  const result = model({ sleep: [interval('2026-10-19T23:00:00+02:00', '2026-10-20T02:00:00+02:00', { duration: 999 }),
    interval('2026-10-20T01:00:00+02:00', '2026-10-20T03:00:30+02:00')] });
  assert.equal(day(result, '2026-10-19').sleepMinutes, 60);
  assert.equal(day(result, '2026-10-20').sleepMinutes, 180.5);
  assert.deepEqual(day(result, '2026-10-20').sleep, [{ from: ms('2026-10-20T00:00:00+02:00'), to: ms('2026-10-20T03:00:30+02:00') }]);
  assert.equal(result.totals.sleepMinutes, 240.5);
});

test('DST days have real 23 or 25 hours, including saved full-day sleep', () => {
  for (const [key, from, to, hours] of [
    ['2026-03-29', '2026-03-29T00:00:00+01:00', '2026-03-30T00:00:00+02:00', 23],
    ['2026-10-25', '2026-10-25T00:00:00+02:00', '2026-10-26T00:00:00+01:00', 25]]) {
    const result = model({ sleep: [interval(from, to)] }, { now: ms(to) - 1 });
    assert.equal(day(result, key).hours, hours);
    assert.equal(day(result, key).sleepMinutes, hours * 60);
  }
});

test('date-duration sleep is daily only and unknown duration invalidates complete total', () => {
  const result = model({ sleep: [{ date: '2026-10-20', duration: '90,5' }, { date: '2026-10-20', duration: 'unknown' },
    interval('2026-10-20T01:00:00+02:00', '2026-10-20T02:00:00+02:00')] });
  const selected = day(result, '2026-10-20');
  assert.equal(selected.sleepMinutes, null);
  assert.equal(selected.knownSleepMinutes, 150.5);
  assert.equal(selected.unknownSleepCount, 1);
  assert.equal(selected.unpositionedSleep, 1);
  assert.equal(selected.sleep.length, 1);
  assert.equal(result.totals.sleepMinutes, null);
});

test('corrupt explicit endpoints cannot fall back to a plausible saved duration', () => {
  const result = model({ sleep: [{ date: '2026-10-20', startTime: 'bad', endTime: options.now, duration: 60 },
    { date: '2026-10-19', duration: 45 }] });
  assert.equal(day(result, '2026-10-20').sleepMinutes, null);
  assert.equal(day(result, '2026-10-20').knownSleepMinutes, 0);
  assert.equal(day(result, '2026-10-19').sleepMinutes, 45);
  assert.equal(result.undated.sleepCount, 0);
  const undated = model({ sleep: [{ duration: 45 }, null] });
  assert.equal(undated.undated.sleepCount, 2);
  assert.equal(undated.totals.sleepMinutes, null);
});

test('running timers remain separate from saved totals and same-name child calls are isolated', () => {
  const data = { name: 'Ala', feeding: [{ timestamp: options.now - 60000 }], running_timers: { sleep: { startTime: options.now - 3600000 }, bf: { startTime: options.now - 120000 } } };
  const before = structuredClone(data);
  assert.equal(model(data).totals.sleepMinutes, 0);
  assert.equal(model(data).totals.feedingCount, 1);
  assert.equal(model({ name: 'Ala' }).totals.feedingCount, 0);
  assert.deepEqual(data, before);
});

test('comparison uses same elapsed local weekday and time, excluding future records on both sides', () => {
  const result = model({ feeding: ['2026-10-20T11:00:00+02:00', '2026-10-20T13:00:00+02:00', '2026-10-21T08:00:00+02:00',
    '2026-10-13T11:00:00+02:00', '2026-10-13T13:00:00+02:00'].map(time => ({ time })),
    sleep: [interval('2026-10-20T11:00:00+02:00', '2026-10-20T13:00:00+02:00')] });
  assert.equal(result.totals.feedingCount, 3);
  assert.equal(result.comparison.comparable, false);
  assert.equal(result.comparison.reason, 'diary_coverage_unknown');
  assert.equal(result.comparison.current.feedingCount, 1);
  assert.equal(result.comparison.previous.feedingCount, 1);
  assert.equal(result.comparison.current.sleepMinutes, 60);
  assert.equal(result.comparison.previous.to, ms('2026-10-13T12:00:00+02:00'));
  assert.equal(Object.hasOwn(result.comparison, 'percent'), false);
});

test('previous cutoff preserves local wall clock across the DST week', () => {
  const result = model({}, { now: ms('2026-10-25T12:30:00+01:00'), weekStart: 0 });
  assert.equal(result.comparison.previous.to, ms('2026-10-18T12:30:00+02:00'));
});

test('averages use the last seven completed local days, with explicit saved-record provenance', () => {
  const result = model({ feeding: [{ time: '2026-10-13T12:00:00+02:00' }, { time: '2026-10-19T12:00:00+02:00' }, { time: '2026-10-20T10:00:00+02:00' }] });
  assert.equal(result.averages.from, ms('2026-10-13T00:00:00+02:00'));
  assert.equal(result.averages.to, ms('2026-10-20T00:00:00+02:00'));
  assert.equal(result.averages.days, 7);
  assert.equal(result.averages.feedingCount, 2 / 7);
  assert.equal(result.averages.source, 'saved_records_last_7_completed_calendar_days');
  assert.equal(result.averages.coverageKnown, false);
});
