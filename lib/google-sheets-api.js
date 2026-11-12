'use strict';

/**
 * Chiamata a Google Sheets tenuta in JavaScript di proposito.
 * `import { google } from 'googleapis'` nel TypeScript fa caricare a tsc
 * i tipi di tutte le API Google e il typecheck supera il heap di default.
 * Il require letterale resta visibile al file tracer di Vercel.
 */

const SCOPE_SHEETS = 'https://www.googleapis.com/auth/spreadsheets';

function creaClientFogli({ clientEmail, privateKey }) {
  // require letterale, non import: vedi il commento in cima al file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { google } = require('googleapis');
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [SCOPE_SHEETS],
  });
  return google.sheets({ version: 'v4', auth });
}

module.exports = { creaClientFogli };
