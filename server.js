import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;
const SM_BASE = process.env.SPEECHMATICS_BASE || 'https://asr.api.speechmatics.com';
const SM_KEY = process.env.SPEECHMATICS_API_KEY;
const SM_LANG = process.env.SPEECHMATICS_LANGUAGE || 'ar';

console.log('🔍 Checking environment variables...');
console.log('SM_KEY exists:', !!SM_KEY);
console.log('SM_BASE:', SM_BASE);
console.log('SM_LANG:', SM_LANG);
console.log('PORT:', PORT);

if (!SM_KEY) {
  console.error('❌ SPEECHMATICS_API_KEY is missing in .env');
  process.exit(1);
}

app.use(express.static(__dirname));

// تحويل SRT إلى VTT محليًا مع إصلاح أي تداخل زمني بين الكتل
function convertSrtToVtt(srtText) {
  const text = (srtText || '').replace(/\r\n/g, '\n').trim();
  if (!text) return 'WEBVTT\n\n';

  const blocks = text.split(/\n\s*\n/);

  function parseTimeToSeconds(t) {
    // HH:MM:SS,mmm أو HH:MM:SS.mmm
    const m = t.trim().replace(',', '.').match(/^(\d{2}):(\d{2}):(\d{2})[\.,](\d{3})$/);
    if (!m) return 0;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3]);
    const ms = Number(m[4]);
    return hh * 3600 + mm * 60 + ss + ms / 1000;
  }

  function formatSecondsToVtt(t) {
    if (t < 0) t = 0;
    const hh = Math.floor(t / 3600);
    const mm = Math.floor((t % 3600) / 60);
    const ss = Math.floor(t % 60);
    const ms = Math.round((t - Math.floor(t)) * 1000);
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad(ms, 3)}`;
  }

  // استخراج الكتل
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    if (!lines.length) continue;

    // قد يبدأ برقم تسلسلي، نتجاهله إن وُجد
    let idx = 0;
    if (/^\d+\s*$/.test(lines[0])) idx = 1;

    const timingLine = lines[idx] || '';
    const timingMatch = timingLine.match(/(\d{2}:\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[\.,]\d{3})/);
    if (!timingMatch) continue;

    const start = parseTimeToSeconds(timingMatch[1]);
    const end = parseTimeToSeconds(timingMatch[2]);
    const textLines = lines.slice(idx + 1);

    cues.push({ start, end, text: textLines.join('\n') });
  }

  // ترتيب وإصلاح التداخل
  cues.sort((a, b) => a.start - b.start);
  const minDuration = 0.35; // حد أدنى لظهور السطر
  for (let i = 0; i < cues.length; i++) {
    const prev = cues[i - 1];
    const cue = cues[i];
    if (prev && cue.start < prev.end) {
      cue.start = prev.end; // ابدأ بعد انتهاء السابق مباشرة
    }
    if (cue.end <= cue.start) {
      cue.end = cue.start + minDuration;
    }
    // منع تداخل النهاية مع بداية التالي
    const next = cues[i + 1];
    if (next && cue.end > next.start) {
      cue.end = Math.max(next.start, cue.start + minDuration);
    }
  }

  // توسعة الكتل متعددة الأسطر إلى كتل متسلسلة (سطر واحد لكل كتلة)
  const expanded = [];
  for (const cue of cues) {
    const lines = (cue.text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (lines.length <= 1) {
      expanded.push(cue);
      continue;
    }
    const duration = Math.max(cue.end - cue.start, minDuration);
    // قسمة زمن الكتلة على عدد الأسطر بالتساوي (أبسط وأضمن)
    const slice = duration / lines.length;
    let cursor = cue.start;
    for (const line of lines) {
      const s = cursor;
      const e = Math.min(cue.end, s + Math.max(slice, minDuration));
      expanded.push({ start: s, end: e, text: line });
      cursor = e;
    }
  }

  // إصلاح نهائي للتداخل بعد التوسعة
  expanded.sort((a, b) => a.start - b.start);
  for (let i = 0; i < expanded.length; i++) {
    const prev = expanded[i - 1];
    const cue = expanded[i];
    if (prev && cue.start < prev.end) cue.start = prev.end;
    if (cue.end <= cue.start) cue.end = cue.start + minDuration;
    const next = expanded[i + 1];
    if (next && cue.end > next.start) cue.end = Math.max(next.start, cue.start + minDuration);
  }

  // إخراج VTT
  const out = ['WEBVTT', ''];
  for (const cue of expanded) {
    out.push(`${formatSecondsToVtt(cue.start)} --> ${formatSecondsToVtt(cue.end)}`);
    out.push(cue.text || '');
    out.push('');
  }
  return out.join('\n');
}

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route لصفحة الهبوط
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

/**
 * بسيط جدًا:
 *  - يستقبل فيديو
 *  - ينشئ Job في Speechmatics
 *  - يعمل polling لغاية ما تبقى الحالة "done"
 *  - يسحب VTT ويعيده كنص
 */
app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No video file provided (field name must be "video")',
        message_ar: 'لم يتم إرسال ملف فيديو. تأكد أن اسم الحقل هو video.'
      });
    }

    // 1) إنشاء Job مع رفع الملف
    const fd = new FormData();
    // config البسيط (لغة فقط). تقدر تزود إعدادات لاحقًا لو حبيت.
    fd.append('config', JSON.stringify({ type: 'transcription', transcription_config: { language: SM_LANG } }), {
      contentType: 'application/json'
    });
    // الملف
    fd.append('data_file', req.file.buffer, {
      filename: req.file.originalname || 'upload.mp4',
      contentType: req.file.mimetype || 'video/mp4'
    });

    const createResp = await axios.post(`${SM_BASE}/v2/jobs/`, fd, {
      headers: {
        Authorization: `Bearer ${SM_KEY}`,
        ...fd.getHeaders()
      },
      maxBodyLength: Infinity
    });

    const jobId = createResp.data.id;
    // 2) Polling لغاية done/failed
    const startedAt = Date.now();
    const timeoutMs = 1000 * 60 * 5; // 5 دقائق كحد أقصى
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    let status = 'running';
    while (status !== 'done') {
      if (Date.now() - startedAt > timeoutMs) {
        return res.status(504).json({ error: 'Transcription timed out' });
      }
      await delay(2000);
      const st = await axios.get(`${SM_BASE}/v2/jobs/${jobId}/`, {
        headers: { Authorization: `Bearer ${SM_KEY}` }
      });
      status = st.data.job?.status || st.data.status || 'running';

      if (status === 'failed') {
        return res.status(500).json({ 
          error: 'Speechmatics job failed', 
          details: st.data,
          message_ar: 'فشل تنفيذ مهمة التفريغ لدى Speechmatics. تحقق من نوع الملف والاشتراك.'
        });
      }
    }

    // 3) جلب SRT ثم تحويله إلى VTT محليًا
    const srtResp = await axios.get(`${SM_BASE}/v2/jobs/${jobId}/transcript`, {
      headers: {
        Authorization: `Bearer ${SM_KEY}`,
        Accept: 'application/x-subrip, text/plain;q=0.9, */*;q=0.8'
      },
      params: { format: 'srt' },
      responseType: 'text'
    });

    const vttFromSrt = convertSrtToVtt(srtResp.data);

    return res.json({
      jobId,
      vtt: vttFromSrt
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    let message_ar = 'حدث خطأ أثناء التفريغ.';
    if(status === 401 || status === 403){
      message_ar = 'اعتماد API غير صالح. تحقق من SPEECHMATICS_API_KEY.';
    }else if(status === 400){
      message_ar = 'طلب غير صالح، ربما نوع الملف أو الإعدادات خاطئة.';
    }else if(status === 413){
      message_ar = 'حجم الملف كبير جدًا.';
    }else if(status === 429){
      message_ar = 'تم تجاوز حد الطلبات. حاول لاحقًا.';
    }else if(status === 504){
      message_ar = 'انتهت مهلة التفريغ.';
    }
    return res.status(status || 500).json({
      error: 'Failed to transcribe',
      status,
      details: data || err.message,
      message_ar
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
