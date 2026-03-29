import { NextResponse } from 'next/server';
import { getHistoryFromSheet } from '@/lib/sheets';

export async function GET() {
  try {
    const history = await getHistoryFromSheet();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Sheet Sync Error:', error);
    if (error.message.includes('AUTH_REQUIRED')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json([], { status: 200 }); 
  }
}
