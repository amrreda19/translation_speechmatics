// الملف الرئيسي - تنسيق وتنسيق المكونات
// Main Script - Component Orchestration

// انتظار تحميل الصفحة قبل تنفيذ الكود
window.addEventListener('DOMContentLoaded', function() {
  // عناصر DOM الأساسية
  const player = document.getElementById('player');
  const log = document.getElementById('log');
  const statusTxt = document.getElementById('statusTxt');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const videoWrapEl = document.getElementById('videoWrap');

  // حالة
  let currentTrack = null;
  let vttBlobUrl = null;

  // جعل المتغيرات متاحة في النطاق العام
  window.currentTrack = currentTrack;

  // تهيئة المكونات
  function initializeComponents() {
    // إعداد واجهة المستخدم
    if (window.UIManager) {
      window.UIManager.setupUIEventListeners();
    }

    // إعداد مشغل الفيديو
    if (window.VideoPlayer) {
      window.VideoPlayer.setupVideoPlayerEventListeners();
    }

    // إعداد محرر النصوص
    if (window.TranscriptEditor) {
      window.TranscriptEditor.setupTranscriptEditorEventListeners();
    }

    // إعداد القوالب
    if (window.TemplateManager) {
      window.TemplateManager.loadTemplates();
      window.TemplateManager.setupTemplateEventListeners();
    }

    // تحميل موضع الكابشن المحفوظ
    if (window.CaptionSystem) {
      window.CaptionSystem.loadCaptionPosition();
    }
  }

  // بدء التشغيل
  initializeComponents();
  
  if (window.UIManager) {
    window.UIManager.write('جاهز. ارفع فيديو أو اسحب ملفك إلى مساحة العمل.');
  }
});
