import { NextRequest, NextResponse } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_URL || 'http://154.12.117.59:5094';

type Context = { params: Promise<{ filename: string[] }> };

// Proxy endpoint untuk file gambar/dokumen dari backend
// /api/uploads/uuid.jpg → http://backend/uploads/uuid.jpg
export async function GET(req: NextRequest, ctx: Context) {
  try {
    const { filename } = await ctx.params;
    const fileStr = filename.join('/');
    const targetUrl = `${BACKEND_ORIGIN}/uploads/${fileStr}`;

    const response = await fetch(targetUrl, {
      headers: { 'Accept': '*/*' },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[Upload proxy error]', err.message);
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }
}
