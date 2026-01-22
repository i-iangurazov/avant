import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonOk } from '@/lib/apiResponse';
import { uploadToStorage } from '@/lib/images/storage';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const extensionFromType = (type: string) => {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return null;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError({ code: 'invalid_payload', message: 'Invalid payload.' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError({ code: 'file_required', message: 'File is required.' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError({ code: 'file_too_large', message: 'File is too large.' }, 413);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError({ code: 'unsupported_file', message: 'Unsupported file type.' }, 415);
  }

  const extension = extensionFromType(file.type);
  if (!extension) {
    return jsonError({ code: 'unsupported_file', message: 'Unsupported file type.' }, 415);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `products/${Date.now()}-${randomUUID()}.${extension}`;
    const url = await uploadToStorage({ key, body: buffer, contentType: file.type });
    return jsonOk({ url });
  } catch (error) {
    console.error(error);
    return jsonError({ code: 'upload_failed', message: 'Upload failed.' }, 500);
  }
}
