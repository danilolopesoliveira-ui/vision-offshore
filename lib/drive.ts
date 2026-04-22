import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/db";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}

// Returns Drive folder ID for a given path array, creating folders as needed.
// Results are cached in DriveFolder table to avoid redundant API calls.
export async function ensureDrivePath(segments: string[]): Promise<string> {
  const path = segments.join("/");

  const cached = await prisma.driveFolder.findUnique({ where: { path } });
  if (cached) {
    return cached.driveId;
  }

  const drive = getDriveClient();
  let parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  for (let i = 0; i < segments.length; i++) {
    const segmentPath = segments.slice(0, i + 1).join("/");
    const segment = segments[i];

    const cachedSeg = await prisma.driveFolder.findUnique({ where: { path: segmentPath } });
    if (cachedSeg) {
      parentId = cachedSeg.driveId;
      continue;
    }

    // Search for existing folder with this name under parentId
    const search = await drive.files.list({
      q: `name='${segment?.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: "files(id)",
      pageSize: 1,
    });

    let folderId: string;
    if (search.data.files && search.data.files.length > 0) {
      folderId = search.data.files[0]!.id!;
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });
      folderId = created.data.id!;
    }

    await prisma.driveFolder.upsert({
      where: { path: segmentPath },
      update: { driveId: folderId, updatedAt: new Date() },
      create: { path: segmentPath, driveId: folderId, updatedAt: new Date() },
    });

    parentId = folderId;
  }

  return parentId;
}

export interface DriveUploadResult {
  driveFileId: string;
  driveUrl: string;
}

export async function uploadToDrive(opts: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folderId: string;
}): Promise<DriveUploadResult> {
  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: opts.filename,
      parents: [opts.folderId],
    },
    media: {
      mimeType: opts.mimeType,
      body: Readable.from(opts.buffer),
    },
    fields: "id,webViewLink",
  });

  if (!response.data.id || !response.data.webViewLink) {
    throw new Error("Google Drive upload failed: missing file ID or URL");
  }

  return {
    driveFileId: response.data.id,
    driveUrl: response.data.webViewLink,
  };
}

export async function deleteFromDrive(driveFileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId: driveFileId });
}
