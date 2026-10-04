// Paste this whole file into your Google Sheet: Extensions → Apps Script.
// Then change the SECRET line below to the value you were given, and deploy as a Web app.
// It creates two tabs automatically: "Signups" and "Visits".

const SECRET = 'PASTE_SECRET_HERE';

const SIGNUP_HEADERS = ['timestamp', 'email', 'variant', 'help_with', 'open_to_chat', 'would_invite',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'visitor_id'];
const VISIT_HEADERS = ['timestamp', 'variant', 'visitor_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer'];

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

  return { ok: true, variants: variants, sources: Object.keys(sources).map(k => sources[k]) };
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
