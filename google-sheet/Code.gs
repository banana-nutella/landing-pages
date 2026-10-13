// Paste this whole file into your Google Sheet: Extensions → Apps Script.
// Then change the SECRET line below to the value you were given, and deploy as a Web app.
// It creates three tabs automatically: "Signups", "Visits" and "App".

const SECRET = 'PASTE_SECRET_HERE';

const SIGNUP_HEADERS = ['timestamp', 'email', 'variant', 'help_with', 'open_to_chat', 'would_invite',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'visitor_id'];
const VISIT_HEADERS = ['timestamp', 'variant', 'visitor_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer'];
// App usage only: what happened, never what someone wrote or logged.
const APP_HEADERS = ['timestamp', 'visitor_id', 'event', 'app_day', 'landing_variant', 'goal'];

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad json' }); }
  if (data.secret !== SECRET) return reply({ ok: false, error: 'bad secret' });

  if (data.type === 'stats') return reply(stats());

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const now = new Date();
    if (data.type === 'signup') {
      sheet('Signups', SIGNUP_HEADERS).appendRow([now, data.email, data.variant, data.help,
        data.chat ? 'yes' : '', data.invite ? 'yes' : '',
        data.utm_source, data.utm_medium, data.utm_campaign, data.utm_term, data.utm_content,
        data.referrer, data.vid].map(safe));
    } else if (data.type === 'visit') {
      sheet('Visits', VISIT_HEADERS).appendRow([now, data.variant, data.vid,
        data.utm_source, data.utm_medium, data.utm_campaign, data.utm_term, data.utm_content,
        data.referrer].map(safe));
    } else if (data.type === 'event') {
      sheet('App', APP_HEADERS).appendRow([now, data.vid, data.event, data.app_day, data.variant, data.goal].map(safe));
    } else {
      return reply({ ok: false, error: 'unknown type' });
    }
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

function stats() {
  const variants = {};
  const sources = {};
  ['a', 'b', 'c', 'd'].forEach(v => variants[v] = { visitors: 0, signups: 0, invite: 0 });
  const bump = (src, v, field) => {
    const key = src + '|' + v;
    if (!sources[key]) sources[key] = { source: src, variant: v, visitors: 0, signups: 0 };
    sources[key][field]++;
  };

  // Unique visitors: each visitor id counted once per variant.
  const seen = {};
  rows('Visits', VISIT_HEADERS).forEach(r => {
    const v = String(r[1]), id = String(r[2]), src = String(r[3] || '').toLowerCase();
    if (!variants[v] || seen[v + id]) return;
    seen[v + id] = true;
    variants[v].visitors++;
    bump(src, v, 'visitors');
  });

  // Signups: each email counted once per variant.
  const emails = {};
  rows('Signups', SIGNUP_HEADERS).forEach(r => {
    const email = String(r[1]).toLowerCase(), v = String(r[2]), src = String(r[6] || '').toLowerCase();
    if (!variants[v] || !email || emails[v + email]) return;
    emails[v + email] = true;
    variants[v].signups++;
    if (r[5] === 'yes') variants[v].invite++;
    bump(src, v, 'signups');
  });

  return { ok: true, variants: variants, sources: Object.keys(sources).map(k => sources[k]), app: appStats() };
}

// App retention: of the people who opened the app, how many keep checking in?
function appStats() {
  const users = {};
  rows('App', APP_HEADERS).forEach(r => {
    const id = String(r[1]), ev = String(r[2]), d = Number(r[3]) || 0;
    if (!id) return;
    const u = users[id] || (users[id] = { variant: String(r[4] || ''), checkinDays: {}, checkins: 0, reps: 0 });
    if (ev === 'checkin') { u.checkins++; u.checkinDays[d] = true; }
    if (ev === 'rep_done') u.reps++;
  });
  const out = { users: 0, checkedIn: 0, twoPlusDays: 0, weekPlus: 0, checkins: 0, reps: 0, byVariant: {} };
  Object.keys(users).forEach(id => {
    const u = users[id], days = Object.keys(u.checkinDays).map(Number);
    const v = out.byVariant[u.variant || '-'] || (out.byVariant[u.variant || '-'] = { users: 0, twoPlusDays: 0 });
    out.users++; v.users++;
    out.checkins += u.checkins; out.reps += u.reps;
    if (days.length) out.checkedIn++;
    if (days.length >= 2) { out.twoPlusDays++; v.twoPlusDays++; }
    if (days.some(d => d >= 7)) out.weekPlus++;
  });
  return out;
}

function sheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function rows(name, headers) {
  const sh = sheet(name, headers);
  const n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, headers.length).getValues();
}

// Stop spreadsheet formula injection (values starting with = + - @).
function safe(v) {
  v = v == null ? '' : v;
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
