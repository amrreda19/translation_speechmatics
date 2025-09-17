# Simple Caption App

أبسط تجربة: صفحة لرفع فيديو → خادم Node/Express يستدعي Speechmatics → يرجّع VTT → يظهر كابتشن على نفس الفيديو.

## الإعداد
1) `cp .env.example .env` ثم عدّل:
- SPEECHMATICS_API_KEY=مفتاحك
- SPEECHMATICS_BASE=غيّرها لو عندك إقليم محدد (مثال: https://eu1.asr.api.speechmatics.com)
- SPEECHMATICS_LANGUAGE=ar (أو لغة أخرى)

2) ثبّت الاعتمادات:
```bash
npm i
