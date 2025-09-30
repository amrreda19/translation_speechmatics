// ملف إدارة القوالب الرئيسي - تجميع جميع الوحدات
// Template Management Main Module - Aggregates All Modules

// هذا الملف يجمع جميع وحدات القوالب ويوفر API موحد

// تصدير API موحد لجميع القوالب
window.TemplateManager = {
  // دوال الأساسيات من templates-core.js
  loadTemplates: window.TemplateCore?.loadTemplates,
  renderTemplateOptions: window.TemplateCore?.renderTemplateOptions,
  applyTemplateStyles: window.TemplateCore?.applyTemplateStyles,
  switchToTemplatesTab: window.TemplateUI?.switchToTemplatesTab,
  setupTemplateEventListeners: window.TemplateUI?.setupTemplateEventListeners,
  getSelectedTemplate: window.TemplateCore?.getSelectedTemplate,
  setSelectedTemplate: window.TemplateCore?.setSelectedTemplate,
  getTemplates: window.TemplateCore?.getTemplates,
  initDOMElements: window.TemplateCore?.initDOMElements,
  
  // دوال الهايلايت من word-highlight.js
  startWordHighlight: window.WordHighlight?.startWordHighlight,
  stopWordHighlight: window.WordHighlight?.stopWordHighlight,
  applyWordHighlightTemplate: window.WordHighlight?.startWordHighlight,
  highlightWord: window.WordHighlight?.highlightWord,
  splitTextIntoWords: window.WordHighlight?.splitTextIntoWords,
  syncWordHighlightWithVideo: window.WordHighlight?.syncWordHighlightWithVideo,
  syncWordHighlightWithVideoPhases: window.WordHighlight?.syncWordHighlightWithVideoPhases,
  updateWordHighlightDisplayWithPhases: window.WordHighlight?.updateWordHighlightDisplayWithPhases,
  
  // دوال قالب الملصقات من sticker-templates.js
  applyStickerTemplate: window.StickerTemplates?.applyStickerTemplate,
  createStickerRow: window.StickerTemplates?.createStickerRow,
  createWordBox: window.StickerTemplates?.createWordBox,
  getNextStickerColor: window.StickerTemplates?.getNextStickerColor,
  getStickerColorByIndex: window.StickerTemplates?.getStickerColorByIndex,
  resetStickerColorIndex: window.StickerTemplates?.resetStickerColorIndex,
  startStickerSync: window.StickerTemplates?.startStickerSync,
  stopStickerSync: window.StickerTemplates?.stopStickerSync,
  syncStickerWithVideo: window.StickerTemplates?.syncStickerWithVideo,
  updateStickerDisplay: window.StickerTemplates?.updateStickerDisplay,
  updateStickerDisplayWithPhases: window.StickerTemplates?.updateStickerDisplayWithPhases,
  
  // دوال نظام المرحلتين من two-phase-system.js
  applyTwoPhaseTemplate: window.TwoPhaseSystem?.applyTwoPhaseTemplate,
  startTwoPhaseSync: window.TwoPhaseSystem?.startTwoPhaseSync,
  stopTwoPhaseSync: window.TwoPhaseSystem?.stopTwoPhaseSync,
  syncTwoPhaseWithVideo: window.TwoPhaseSystem?.syncTwoPhaseWithVideo,
  updateTwoPhaseDisplay: window.TwoPhaseSystem?.updateTwoPhaseDisplay,
  
  // دوال قالب هايلايت كابشن من highlight-caption.js
  applyHighlightCaptionTemplate: window.HighlightCaption?.applyHighlightCaptionTemplate,
  startHighlightCaptionSync: window.HighlightCaption?.startHighlightCaptionSync,
  stopHighlightCaptionSync: window.HighlightCaption?.stopHighlightCaptionSync,
  syncHighlightCaptionWithVideo: window.HighlightCaption?.syncHighlightCaptionWithVideo,
  updateHighlightCaptionDisplayWithPhases: window.HighlightCaption?.updateHighlightCaptionDisplayWithPhases,
  
  // دوال قالب الكلمة الواحدة من single-word-sync.js
  applySingleWordSyncTemplate: window.SingleWordSync?.applySingleWordSyncTemplate,
  startSingleWordSync: window.SingleWordSync?.startSingleWordSync,
  stopSingleWordSync: window.SingleWordSync?.stopSingleWordSync,
  syncSingleWordWithVideo: window.SingleWordSync?.syncSingleWordWithVideo,
  updateSingleWordDisplay: window.SingleWordSync?.updateSingleWordDisplay,
  
  // دوال قالب الكتابة على الآلة الكاتبة من typewriter.js
  applyArabicTypewriterTemplate: window.Typewriter?.applyArabicTypewriterTemplate,
  startArabicTypewriter: window.Typewriter?.startArabicTypewriter,
  stopArabicTypewriter: window.Typewriter?.stopArabicTypewriter,
  syncArabicTypewriterWithVideo: window.Typewriter?.syncArabicTypewriterWithVideo,
  updateArabicTypewriterDisplay: window.Typewriter?.updateArabicTypewriterDisplay,
  updateArabicTypewriterDisplayWithPhases: window.Typewriter?.updateArabicTypewriterDisplayWithPhases,
  
  // دوال إضافية للوصول إلى الوحدات المنفصلة
  getWordHighlightModule: () => window.WordHighlight,
  getStickerTemplatesModule: () => window.StickerTemplates,
  getHighlightCaptionModule: () => window.HighlightCaption,
  getSingleWordSyncModule: () => window.SingleWordSync,
  getTypewriterModule: () => window.Typewriter,
  getTwoPhaseSystemModule: () => window.TwoPhaseSystem,
  getTemplateCoreModule: () => window.TemplateCore,
  getTemplateUIModule: () => window.TemplateUI
};

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  console.log('تم تحميل نظام القوالب المنقسم');
  
  // التحقق من وجود جميع الوحدات
  const modules = [
    'TemplateCore',
    'TemplateUI', 
    'WordHighlight',
    'StickerTemplates',
    'HighlightCaption',
    'SingleWordSync',
    'Typewriter',
    'TwoPhaseSystem'
  ];
  
  const loadedModules = modules.filter(module => window[module]);
  const missingModules = modules.filter(module => !window[module]);
  
  console.log(`الوحدات المحملة: ${loadedModules.join(', ')}`);
  if (missingModules.length > 0) {
    console.warn(`الوحدات المفقودة: ${missingModules.join(', ')}`);
  }
  
  // تهيئة واجهة المستخدم
  if (window.TemplateUI && window.TemplateUI.setupTemplateEventListeners) {
    window.TemplateUI.setupTemplateEventListeners();
  }
  
  // تحميل القوالب
  if (window.TemplateCore && window.TemplateCore.loadTemplates) {
    window.TemplateCore.loadTemplates();
  }
});

// تصدير معلومات النظام
window.TemplateSystemInfo = {
  version: '2.0.0',
  modules: [
    'templates-core.js',
    'templates-ui.js',
    'word-highlight.js',
    'sticker-templates.js',
    'highlight-caption.js',
    'single-word-sync.js',
    'typewriter.js',
    'two-phase-system.js',
    'templates-main.js'
  ],
  description: 'نظام القوالب المنقسم - إدارة قوالب الترجمة المتقدمة',
  author: 'Template System Developer',
  lastUpdated: new Date().toISOString()
};

console.log('تم تحميل نظام القوالب المنقسم بنجاح!');
console.log('معلومات النظام:', window.TemplateSystemInfo);
