import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid, prompt, subMateri, modelType, difficulty,
      count = 5, language = "Indonesia", role = "student",
      imageContent, imageMimeType, questionTypes,
      includeClue, includeExplanation
    } = body;

    if (!uid || !prompt || !modelType || !difficulty) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://smart-class-d26fa-default-rtdb.asia-southeast1.firebasedatabase.app';

    // 1. Check limits from RTDB
    let limitsData = { Pintar: 0, Menengah: 0, Biasa: 0 };
    try {
      const limitRes = await fetch(`${rtdbUrl}/users/${uid}/ai_limits/${today}.json`);
      const existing = await limitRes.json();
      if (existing) limitsData = { ...limitsData, ...existing };
    } catch (e) {}

    let maxLimit = (role === 'teacher' || role === 'admin')
      ? (modelType === 'Biasa' ? 10 : 8)
      : (modelType === 'Biasa' ? 5 : 1);

    if (limitsData[modelType as keyof typeof limitsData] >= maxLimit) {
      return NextResponse.json({ error: `Limit penggunaan AI ${modelType} harian Anda sudah habis.` }, { status: 403 });
    }

    // 2. Build AI Prompt
    let clueInstruction = "Isi field 'clue' dengan petunjuk singkat untuk membantu siswa.";
    if (includeClue === false) clueInstruction = "Isi field 'clue' dengan string kosong \"\" karena clue tidak diminta.";
    else if (difficulty == 1) clueInstruction = "Isi field 'clue' dengan petunjuk yang jelas (maksimal 2 kalimat).";
    else if (difficulty == 2) clueInstruction = "Isi field 'clue' dengan kata kunci singkat (maksimal 3 kata).";
    else if (difficulty == 3) clueInstruction = "Isi field 'clue' dengan string kosong \"\" (jangan beri clue untuk tingkat sulit).";

    let expInstruction = "Isi field 'explanation' dengan penjelasan lengkap mengenai jawaban yang benar.";
    if (includeExplanation === false) expInstruction = "Isi field 'explanation' dengan string kosong \"\" karena penjelasan tidak diminta.";

    const maxQuestions = Math.min(parseInt(String(count)), 20);
    const typesStr = (questionTypes && questionTypes.length > 0) ? questionTypes.join(', ') : 'Pilihan Ganda (PG)';

    const systemPrompt = `Kamu adalah guru cerdas penanggung jawab pembuatan soal olimpiade. TUGAS UTAMA: Buatkan tepat ${maxQuestions} soal dengan variasi tipe: [${typesStr}] berdasarkan perintah pengguna: "${prompt}" ${subMateri ? "dengan sub-materi: " + subMateri : ""}.
${imageContent ? "INSTRUKSI KRITIS: Pengguna melampirkan file REFERENSI! Kamu WAJIB meneliti isi file tersebut dan membuat soal yang bersumber atau terinspirasi kuat dari konten file tersebut. JANGAN membuat soal yang tidak relevan dengan referensi ini." : ""}

Tipe Soal Detail:
1. PG (Pilihan Ganda): 4 opsi (A-D), 1 jawaban benar.
2. PGK (Pilihan Ganda Kompleks): 4-5 opsi, LEBIH DARI 1 jawaban benar. Field 'correctAnswer' HARUS berupa ARRAY string (misal: ["A", "C"]).
3. Essay: Tanpa opsi (isi 'options' dengan array kosong []), 'correctAnswer' berupa teks kunci jawaban.

Tingkat kesulitan: ${difficulty} (1 mudah, 2 sedang, 3 sulit).
- ${clueInstruction}
- ${expInstruction}

Gunakan Bahasa ${language}. Rumus gunakan LaTeX ($..$).
Output HARUS murni format JSON:
{
  "questions": [
    {
      "type": "PG atau PGK atau Essay",
      "question": "teks soal",
      "options": ["A. opsi1", "B. opsi2", ...],
      "correctAnswer": "A" atau ["A", "C"] atau "teks jawaban essay",
      "explanation": "penjelasan",
      "clue": "petunjuk"
    }
  ]
}
Pastikan total ada tepat ${maxQuestions} soal.`;

    let generatedText = "";
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (modelType === 'Pintar' || !openrouterKey) {
      if (!geminiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi di environment.');

      const partsArr: any[] = [{ text: systemPrompt }];
      if (imageContent && imageMimeType) {
        partsArr.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageContent
          }
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: partsArr }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7
            }
          })
        }
      );

      const geminiData = await res.json();
      if (!res.ok) throw new Error(geminiData?.error?.message || 'Gagal memanggil Gemini API');
      generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      let model = modelType === 'Menengah' ? 'anthropic/claude-3-haiku' : 'meta-llama/llama-3.1-8b-instruct';
      let contentPayload: any = systemPrompt;
      if (imageContent && imageMimeType) {
        model = 'google/gemini-2.5-flash';
        contentPayload = [
          { type: 'text', text: systemPrompt },
          { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageContent}` } }
        ];
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'X-Title': 'Arthea Smart Class'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Kamu adalah guru cerdas penanggung jawab pembuatan soal olimpiade.' },
            { role: 'user', content: contentPayload }
          ],
          temperature: 0.7,
          max_tokens: 3000
        })
      });

      const orData = await res.json();
      if (!res.ok) throw new Error(orData?.error?.message || 'Gagal memanggil OpenRouter API');
      generatedText = orData.choices?.[0]?.message?.content || '';
    }

    // 3. Parse JSON from model output
    let cleanJsonStr = generatedText.trim();
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanJsonStr = jsonMatch[0];

    cleanJsonStr = cleanJsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    let parsed = JSON.parse(cleanJsonStr);
    let questionsData = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.soal || [parsed]);

    questionsData = questionsData.map((q: any) => ({
      ...q,
      clue: q.clue || "Tidak ada clue untuk pertanyaan ini",
      explanation: q.explanation || "Tidak ada penjelasan untuk pertanyaan ini"
    }));

    // 4. Update Limits in Firebase RTDB
    limitsData[modelType as keyof typeof limitsData] += 1;
    await fetch(`${rtdbUrl}/users/${uid}/ai_limits/${today}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(limitsData)
    });

    return NextResponse.json({
      success: true,
      questions: questionsData,
      limits: limitsData
    });
  } catch (err: any) {
    console.error('Error in AI generate route:', err);
    return NextResponse.json({ error: 'Gagal men-generate soal', detail: err.message }, { status: 500 });
  }
}
