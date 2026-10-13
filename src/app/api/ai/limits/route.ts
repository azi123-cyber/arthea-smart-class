import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'uid dibutuhkan' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://smart-class-d26fa-default-rtdb.asia-southeast1.firebasedatabase.app';
    
    const res = await fetch(`${rtdbUrl}/users/${uid}/ai_limits/${today}.json`);
    const data = await res.json();

    return NextResponse.json({
      success: true,
      data: data || { Pintar: 0, Menengah: 0, Biasa: 0 }
    });
  } catch (err: any) {
    console.error('Error get AI limits:', err);
    return NextResponse.json({ error: 'Gagal mendapatkan limit AI' }, { status: 500 });
  }
}
