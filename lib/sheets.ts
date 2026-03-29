import { google } from 'googleapis';

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export async function getSheetsClient() {
  const oauth2Client = getOAuthClient();
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('AUTH_REQUIRED');
  }
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export async function appendHistoryToSheet(data: { folio: string, contract: string, empresa: string, supervisor: string }) {
  const sheets = await getSheetsClient();
  const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'HISTORIAL RECOVERY!A2',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[data.folio, data.contract, data.empresa, data.supervisor, timestamp]],
    },
  });
}

export async function getHistoryFromSheet() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'HISTORIAL RECOVERY!A2:E101', 
  });

  const rows = response.data.values || [];
  return rows.map((row, idx) => ({
    id: `sheet-${idx}`,
    folio: row[0],
    contract: row[1],
    empresa: row[2],
    supervisor: row[3],
    timestamp: row[4],
  })).reverse(); 
}
