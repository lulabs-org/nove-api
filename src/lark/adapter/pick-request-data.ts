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

interface MulterRequest extends Request {
  file?: MulterFile;
  files?: MulterFile[] | { [fieldname: string]: MulterFile[] };
}

export function pickRequestData(req: Request): Record<string, unknown> {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    // Express 已经自动解析 JSON body 到 req.body
    return (req.body as Record<string, unknown>) ?? {};
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    // 同样 Express 的 bodyParser 会自动处理
    return (req.body as Record<string, unknown>) ?? {};
  }

  if (contentType.includes('multipart/form-data')) {
    // 这里要配合 multer 或 fastify-multipart 等中间件来解析
    // 比如用了 multer，就可以直接从 req.body 和 req.file(s) 里拿数据
    const multerReq = req as MulterRequest;
    const data: Record<string, unknown> = {
      ...(multerReq.body as Record<string, unknown>),
    };

    if (multerReq.file) {
      data[multerReq.file.fieldname] = multerReq.file;
    }

    if (multerReq.files) {
      // 如果是多个文件（multer.array / multer.fields）
      // req.files 可能是对象或数组
      data['files'] = multerReq.files;
    }

    return data;
  }

  // 默认 fallback：headers + query + params
  return {
    ...(req.query as Record<string, unknown>),
    ...(req.params as Record<string, unknown>),
    ...(req.body as Record<string, unknown>),
  };
}
