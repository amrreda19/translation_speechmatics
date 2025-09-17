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

// تحويل SRT إلى VTT محليًا
function convertSrtToVtt(srtText) {
  const normalized = (srtText || '').replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const outputLines = ['WEBVTT', ''];

  for (const line of lines) {
    // حذف أرقام الكتل
    if (/^\d+\s*$/.test(line)) continue;

    // تحويل الفواصل العشرية في التوقيت من "," إلى "." فقط في سطر التوقيت
    if (/\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}/.test(line)) {
      outputLines.push(line.replace(/,(?=\d{3}(?:\s|$))/g, '.'));
      continue;
    }

    outputLines.push(line);
  }

  // تقليل الفراغات الزائدة بين الكتل
  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
      return res.status(400).json({ error: 'No video file provided (field name must be "video")' });
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
        return res.status(500).json({ error: 'Speechmatics job failed', details: st.data });
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
    return res.status(status || 500).json({
      error: 'Failed to transcribe',
      status,
      details: data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
