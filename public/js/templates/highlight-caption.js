// ملف قالب هايلايت كابشن الجديد
// Highlight Caption Template Module

// متغيرات قالب هايلايت كابشن الجديد
let highlightCaptionSyncInterval = null;
let currentHighlightCaptionWordIndex = 0;
let highlightCaptionWordElements = [];
let isHighlightCaptionSyncActive = false;

// تطبيق قالب هايلايت كابشن الجديد
function applyHighlightCaptionTemplate(captionBox, template) {
  if (!captionBox || !template || !template.highlightMode?.enabled) return;
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // تقسيم النص إلى كلمات
  const words = splitTextIntoWords(text);
  if (words.length === 0) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء حاوية للنص مع نظام المراحل المتعددة
  const textContainer = document.createElement('div');
  textContainer.className = 'highlight-caption-phase-container';
  textContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 2px;
    width: 100%;
  `;
  
  captionBox.appendChild(textContainer);
  
  // تطبيق الأنماط الخاصة بالقالب الجديد
  captionBox.style.width = 'auto';
  captionBox.style.maxWidth = '90%';
  captionBox.style.minWidth = '200px';
  captionBox.style.display = 'inline-block';
  
  // إضافة كلاس خاص للقالب الجديد
  captionBox.classList.add('highlight-caption-mode');

  // حقن الأنميشن لهذا القالب فقط (سيُطبَّق على الكلمات لاحقاً)
  if (template.animation && window.TemplateCore && window.TemplateCore.getTemplates) {
    const templates = window.TemplateCore.getTemplates();
    if (templates?.animations?.[template.animation]?.keyframes) {
      window.TemplateCore.injectAnimationByName(template.animation);
    }
  }
  
  // بدء التزامن مع الصوت إذا كان متاحاً
  const vttCues = window.vttCues || [];
  if (vttCues && vttCues.length > 0) {
    const video = document.querySelector('video');
    if (video) {
      const currentTime = video.currentTime;
      const currentCue = vttCues.find(cue => 
        currentTime >= cue.start && currentTime <= cue.end
      );
      
      if (currentCue) {
        const vttData = {
          start: currentCue.start,
          end: currentCue.end,
          text: currentCue.text
        };
        startHighlightCaptionSync(captionBox, template, vttData, words);
      } else {
        // لا يوجد cue حالي: ابدأ بأول cue كحل افتراضي
        const firstCue = vttCues[0];
        if (firstCue) {
          const vttData = {
            start: firstCue.start,
            end: firstCue.end,
            text: firstCue.text
          };
          startHighlightCaptionSync(captionBox, template, vttData, words);
        }
      }
    } else {
      // لا يوجد عنصر فيديو: استخدم نصاً افتراضياً مع مدة 5 ثوانٍ
      const currentText = captionBox.textContent || captionBox.innerText;
      if (currentText && currentText.trim()) {
        const vttData = { start: 0, end: 5, text: currentText };
        startHighlightCaptionSync(captionBox, template, vttData, words);
      }
    }
  } else {
    // إذا لم تكن هناك بيانات VTT، نطبق العرض العادي
    const currentText = captionBox.textContent || captionBox.innerText;
    if (currentText && currentText.trim()) {
      const vttData = {
        start: 0,
        end: 5, // مدة افتراضية 5 ثوان
        text: currentText
      };
      startHighlightCaptionSync(captionBox, template, vttData, words);
    }
  }
  
  // إعادة إنشاء المقابض بعد تطبيق القالب
  setTimeout(() => {
    if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
      window.CaptionSystem.ensureResizeHandles();
    }
  }, 100);
}

// بدء التزامن مع الصوت لقالب هايلايت كابشن الجديد
function startHighlightCaptionSync(captionBox, template, vttData, words) {
  if (!template.highlightMode?.syncWithAudio || !vttData) return;
  
  stopHighlightCaptionSync(); // إيقاف أي تزامن سابق
  
  // الحصول على جميع عناصر الكلمات
  highlightCaptionWordElements = captionBox.querySelectorAll('.highlight-caption-phase-container');
  if (highlightCaptionWordElements.length === 0) return;
  
  isHighlightCaptionSyncActive = true;
  currentHighlightCaptionWordIndex = -1;
  
  // بدء التزامن مع الفيديو
  syncHighlightCaptionWithVideo(template, vttData, words);
}

// إيقاف التزامن مع الصوت لقالب هايلايت كابشن الجديد
function stopHighlightCaptionSync() {
  if (highlightCaptionSyncInterval) {
    clearInterval(highlightCaptionSyncInterval);
    highlightCaptionSyncInterval = null;
  }
  
  isHighlightCaptionSyncActive = false;
  currentHighlightCaptionWordIndex = 0;
  highlightCaptionWordElements = [];
}

// التزامن مع الفيديو لقالب هايلايت كابشن الجديد
function syncHighlightCaptionWithVideo(template, vttData, words) {
  if (!isHighlightCaptionSyncActive || !vttData) return;
  
  const video = document.querySelector('video');
  if (!video) return;
  
  // حساب مدة كل كلمة بناءً على مدة الكابشن
  const totalDuration = vttData.end - vttData.start;
  const wordDuration = totalDuration / words.length;
  
  // تحديد المراحل
  const maxWordsPerPhase = (template && template.highlightMode && template.highlightMode.maxWords) ? template.highlightMode.maxWords : 4;
  const hasSecondPhase = words.length > maxWordsPerPhase;
  const firstPhaseWords = words.slice(0, maxWordsPerPhase);
  const secondPhaseWords = words.slice(maxWordsPerPhase);
  
  // تحديث النص بناءً على وقت الفيديو
  const updateHighlightCaption = () => {
    if (!isHighlightCaptionSyncActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      let newWordIndex;
      
      // حساب فهرس الكلمة الحالية
      newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
      
      // لا نعيد الرسم إلا إذا تغيرت الكلمة
      if (newWordIndex !== currentHighlightCaptionWordIndex) {
        currentHighlightCaptionWordIndex = newWordIndex;
        updateHighlightCaptionDisplayWithPhases(newWordIndex, words, firstPhaseWords, secondPhaseWords, template);
      }
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء النص
      if (currentHighlightCaptionWordIndex !== -1) {
        currentHighlightCaptionWordIndex = -1;
        updateHighlightCaptionDisplayWithPhases(-1, words, firstPhaseWords, secondPhaseWords, template);
      }
    } else {
      // بعد نهاية الكابشن - إظهار جميع الكلمات
      if (currentHighlightCaptionWordIndex !== words.length - 1) {
        currentHighlightCaptionWordIndex = words.length - 1;
        updateHighlightCaptionDisplayWithPhases(words.length - 1, words, firstPhaseWords, secondPhaseWords, template);
      }
    }
  };
  
  // تحديث كل 16ms للحصول على تزامن أكثر دقة (60fps)
  highlightCaptionSyncInterval = setInterval(updateHighlightCaption, 16);
  
  // تحديث فوري
  updateHighlightCaption();
}

// تحديث عرض قالب هايلايت كابشن مع دعم المرحلتين
function updateHighlightCaptionDisplayWithPhases(wordIndex, allWords, firstPhaseWords, secondPhaseWords, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.highlight-caption-phase-container');
  if (!textContainer) return;
  
  const maxWordsPerPhase = (template && template.highlightMode && template.highlightMode.maxWords) ? template.highlightMode.maxWords : 4;
  const hasSecondPhase = allWords.length > maxWordsPerPhase;
  
  // تحديد المرحلة الحالية
  let currentPhase = 1;
  let wordsToShow = firstPhaseWords;
  
  if (hasSecondPhase && wordIndex >= maxWordsPerPhase) {
    currentPhase = 2;
    wordsToShow = secondPhaseWords;
  }
  
  // مسح النص الحالي
  textContainer.innerHTML = '';
  
  // إظهار الكلمات المناسبة للمرحلة الحالية
  if (wordIndex >= 0) {
    const wordsInCurrentPhase = currentPhase === 1 ? firstPhaseWords : secondPhaseWords;
    const startIndex = currentPhase === 1 ? 0 : maxWordsPerPhase;
    const relativeWordIndex = wordIndex - startIndex;
    
    wordsInCurrentPhase.forEach((word, index) => {
      if (index <= relativeWordIndex) {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        wordSpan.style.cssText = `
          display: inline-block;
          margin: 0 2px;
          padding: 0;
          transition: all 0.1s ease;
        `;
        
        // تطبيق الحركة على الكلمة الحالية فقط
        if (index === relativeWordIndex) {
          const animName = template.animation;
          let animDef = null;
          if (window.TemplateCore && window.TemplateCore.getTemplates) {
            const templates = window.TemplateCore.getTemplates();
            animDef = templates && templates.animations ? templates.animations[animName] : null;
          }
          if (animName && animDef) {
            wordSpan.style.animation = `${animName} ${animDef.duration || '0.7s'} ${animDef.timingFunction || 'ease'} both`;
          } else {
            // تأثير بديل بسيط
            wordSpan.style.transform = 'scale(1.05)';
          }
        }
        textContainer.appendChild(wordSpan);
      }
    });
  }
}

// دالة تقسيم النص إلى كلمات (مستوردة من word-highlight.js)
function splitTextIntoWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(word => word.length > 0);
}

// تصدير دوال قالب هايلايت كابشن للنطاق العام
window.HighlightCaption = {
  applyHighlightCaptionTemplate,
  startHighlightCaptionSync,
  stopHighlightCaptionSync,
  syncHighlightCaptionWithVideo,
  updateHighlightCaptionDisplayWithPhases,
  splitTextIntoWords,
  // متغيرات النظام
  getHighlightCaptionSyncInterval: () => highlightCaptionSyncInterval,
  getCurrentHighlightCaptionWordIndex: () => currentHighlightCaptionWordIndex,
  getHighlightCaptionWordElements: () => highlightCaptionWordElements,
  getIsHighlightCaptionSyncActive: () => isHighlightCaptionSyncActive
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.highlightCaptionSyncInterval = highlightCaptionSyncInterval;
window.currentHighlightCaptionWordIndex = currentHighlightCaptionWordIndex;
window.highlightCaptionWordElements = highlightCaptionWordElements;
window.isHighlightCaptionSyncActive = isHighlightCaptionSyncActive;
window.applyHighlightCaptionTemplate = applyHighlightCaptionTemplate;
window.stopHighlightCaptionSync = stopHighlightCaptionSync;
