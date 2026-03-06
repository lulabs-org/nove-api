import { Request } from 'express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface MulterRequest {
  file?: MulterFile;
  files?: MulterFile[] | { [fieldname: string]: MulterFile[] };
  body?: Record<string, unknown>;
}

export function pickRequestData(req: Request): Record<string, unknown> {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    return (req.body as Record<string, unknown>) ?? {};
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return (req.body as Record<string, unknown>) ?? {};
  }

  if (contentType.includes('multipart/form-data')) {
    const multerReq = req as unknown as MulterRequest;
    const data: Record<string, unknown> = {
      ...(multerReq.body as Record<string, unknown>),
    };

    if (multerReq.file) {
      data[multerReq.file.fieldname] = multerReq.file;
    }

    if (multerReq.files) {
      data['files'] = multerReq.files;
    }

    return data;
  }

  return {
    ...(req.query as Record<string, unknown>),
    ...(req.params as Record<string, unknown>),
    ...(req.body as Record<string, unknown>),
  };
}
