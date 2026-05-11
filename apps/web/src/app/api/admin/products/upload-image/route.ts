import { requireAdmin } from '@/lib/auth/requireAdmin';
import { jsonError, jsonOk } from '@/lib/apiResponse';
import {
  ProductImageSourceError,
  resolveProductImageUrl,
  resolveUploadedImageContentType,
  uploadProductImageBuffer,
} from '@/lib/images/productImage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError({ code: 'invalid_payload', message: 'Invalid payload.' }, 400);
  }

  const file = formData.get('file');
  const source = formData.get('imageUrl') ?? formData.get('url') ?? formData.get('source');

  try {
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentType = resolveUploadedImageContentType({
        body: buffer,
        declaredType: file.type,
        fileName: file.name,
      });
      if (!contentType || buffer.length === 0) {
        return jsonError({ code: 'unsupported_file', message: 'Unsupported file type.' }, 415);
      }

      const imageUrl = await uploadProductImageBuffer({ body: buffer, contentType });
      return jsonOk({ url: imageUrl });
    }

    if (typeof source === 'string' && source.trim()) {
      const imageUrl = await resolveProductImageUrl(source);
      if (!imageUrl) {
        return jsonError({ code: 'invalid_image_url', message: 'Некорректный URL изображения.' }, 400);
      }
      return jsonOk({ url: imageUrl });
    }

    return jsonError({ code: 'file_required', message: 'File or image URL is required.' }, 400);
  } catch (error) {
    if (error instanceof ProductImageSourceError) {
      return jsonError({ code: 'invalid_image_url', message: error.message }, 400);
    }
    console.error(error);
    return jsonError({ code: 'upload_failed', message: 'Upload failed.' }, 500);
  }
}
