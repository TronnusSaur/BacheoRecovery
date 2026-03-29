import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateFolder, uploadFile } from '@/lib/drive';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contract = formData.get('contract') as string;
    const empresa = formData.get('empresa') as string;
    const folio = formData.get('folio') as string;
    const phase = formData.get('phase') as string; 
    const file = formData.get('file') as File;

    if (!contract || !empresa || !folio || !phase || !file) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const parentFolderId = process.env.DRIVE_PARENT_FOLDER_ID;
    if (!parentFolderId) {
      return NextResponse.json({ error: 'Configuraci\u00f3n de Drive incompleta (Parent Folder ID)' }, { status: 500 });
    }

    const contractFolderName = `${contract} ${empresa}`;
    const contractFolderId = await getOrCreateFolder(contractFolderName, parentFolderId);
    const folioFolderId = await getOrCreateFolder(folio, contractFolderId);
    const newFileName = `${folio}_${phase}.jpg`;
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const fileId = await uploadFile(newFileName, buffer, file.type, folioFolderId);

    try {
      const { appendHistoryToSheet } = require('@/lib/sheets');
      await appendHistoryToSheet({
        folio,
        contract,
        empresa,
        supervisor: formData.get('supervisor') as string || 'N/A',
      });
    } catch (hError) {
      console.error('Failed to log history to Sheet:', hError);
    }

    return NextResponse.json({ success: true, fileId });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
