import { google } from 'googleapis';
import { Readable } from 'stream';

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export async function getDriveClient() {
  const oauth2Client = getOAuthClient();
  
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('AUTH_REQUIRED');
  }

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

const driveCache: Record<string, string> = {};

export async function getOrCreateFolder(name: string, parentId?: string) {
  const cacheKey = `${parentId || 'root'}_${name}`;
  if (driveCache[cacheKey]) return driveCache[cacheKey];

  const drive = await getDriveClient();
  const q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' ${parentId ? `and '${parentId}' in parents` : ''} and trashed = false`;
  
  const response = await drive.files.list({
    q,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    const id = response.data.files[0].id!;
    driveCache[cacheKey] = id;
    return id;
  }

  const folderMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : [],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  const newId = folder.data.id!;
  driveCache[cacheKey] = newId;
  return newId;
}

export async function uploadFile(
  fileName: string, 
  buffer: Buffer, 
  mimeType: string, 
  folderId: string
) {
  const drive = await getDriveClient();
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  });

  return file.data.id;
}
