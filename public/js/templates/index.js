// ملف فهرس القوالب - Template Index File
// هذا الملف يحمل جميع ملفات القوالب بالترتيب الصحيح

// تحميل الملفات بالترتيب المطلوب
const templateFiles = [
  'templates-core.js',
  'templates-ui.js', 
  'word-highlight.js',
  'sticker-templates.js',
  'highlight-caption.js',
  'single-word-sync.js',
  'typewriter.js',
  'two-phase-system.js',
  'templates-main.js'
];

// تحميل جميع الملفات
templateFiles.forEach(file => {
  const script = document.createElement('script');
  script.src = `public/js/templates/${file}`;
  script.async = false; // تحميل متسلسل لضمان الترتيب
  document.head.appendChild(script);
});

console.log('تم تحميل جميع ملفات القوالب من مجلد templates/');
