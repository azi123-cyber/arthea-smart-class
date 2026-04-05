import { NextRequest, NextResponse } from 'next/server';

// URL backend Pterodactyl (server-side only, tidak perlu NEXT_PUBLIC)
const BACKEND_ORIGIN = process.env.BACKEND_URL || 'http://154.12.117.59:5094';
const API_TOKEN = process.env.API_SECRET_TOKEN || 'arthea_smart_class_2024_secure_99';

type Context = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Context) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, 'GET');
}

export async function POST(req: NextRequest, ctx: Context) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, 'POST');
}

export async function DELETE(req: NextRequest, ctx: Context) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, 'DELETE');
}

export async function PUT(req: NextRequest, ctx: Context) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, 'PUT');
}

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  try {
    const path = pathSegments.join('/');
    const searchParams = req.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_ORIGIN}/${path}${searchParams ? '?' + searchParams : ''}`;

    const contentType = req.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (isMultipart) {
        body = await req.blob();
      } else {
        body = await req.text();
      }
    }

    const headers: Record<string, string> = {
      'x-api-token': API_TOKEN,
    };

    if (!isMultipart && contentType) {
      headers['content-type'] = contentType;
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseContentType = response.headers.get('content-type') || '';

    // Kalau binary (file/image), stream langsung
    if (responseContentType.includes('image') || responseContentType.includes('octet-stream')) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          'content-type': responseContentType,
          'cache-control': 'public, max-age=31536000, immutable',
          'access-control-allow-origin': '*',
        },
      });
    }

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'content-type': responseContentType || 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[Proxy Error]', err.message);
    return NextResponse.json(
      { error: 'Gagal menghubungi server backend', detail: err.message },
      { status: 502 }
    );
  }
}
