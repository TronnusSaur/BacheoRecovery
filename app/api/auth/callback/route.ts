import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code as string);
    const refreshToken = tokens.refresh_token;

    if (refreshToken) {
      const envPath = path.resolve(process.cwd(), '.env.local');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN='[^']*'/, `GOOGLE_REFRESH_TOKEN='${refreshToken}'`);
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN='${refreshToken}'`;
      }
      
      fs.writeFileSync(envPath, envContent);

      return new NextResponse('Autenticaci\u00f3n exitosa! Puedes cerrar esta pesta\u00f1a y volver a la app.', { status: 200 });
    }

    return NextResponse.json({ error: 'No se obtuvo un Refresh Token' }, { status: 400 });

  } catch (error: any) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
