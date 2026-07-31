import fs from 'fs';
import path from 'path';
import { config } from '../config';

export async function uploadVideoFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  if (config.storage.type === 's3') {
    // S3 upload fallback or mock return
    return `${config.storage.s3Endpoint}/${config.storage.s3Bucket}/${fileName}`;
  }

  // Local storage implementation
  const uploadDir = path.resolve(process.cwd(), config.storage.localDir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, fileBuffer);

  return `${config.appUrl}/uploads/${fileName}`;
}
