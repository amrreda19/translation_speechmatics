// ملف قالب الكلمة الواحدة المتزامنة
// Single Word Sync Template Module

// متغيرات قالب الكلمة الواحدة المتزامنة
let singleWordSyncInterval = null;
let currentSingleWordIndex = 0;
let singleWordElements = [];
let isSingleWordSyncActive = false;

// تطبيق قالب الكلمة الواحدة المتزامنة
function applySingleWordSyncTemplate(captionBox, template) {
  if (!captionBox || !template || !template.singleWordMode?.enabled) return;
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // تقسيم النص إلى كلمات
  const words = splitTextIntoWords(text);
  if (words.length === 0) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء حاوية للنص
  const textContainer = document.createElement('div');
  textContainer.className = 'single-word-sync-container';
  textContainer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  `;
  
  captionBox.appendChild(textContainer);
  
  // تطبيق الأنماط الخاصة بالقالب الجديد
  captionBox.style.width = 'auto';
  captionBox.style.maxWidth = '90%';
  captionBox.style.minWidth = '200px';
  captionBox.style.display = 'flex';
  captionBox.style.justifyContent = 'center';
  captionBox.style.alignItems = 'center';
  
  // إضافة كلاس خاص للقالب الجديد
  captionBox.classList.add('single-word-sync-mode');

  // حقن الأنميشن لهذا القالب فقط
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
        startSingleWordSync(captionBox, template, vttData, words);
      } else {
        // لا يوجد cue حالي: ابدأ بأول cue كحل افتراضي
        const firstCue = vttCues[0];
        if (firstCue) {
          const vttData = {
            start: firstCue.start,
            end: firstCue.end,
            text: firstCue.text
          };
          startSingleWordSync(captionBox, template, vttData, words);
        }
      }
    } else {
      // لا يوجد عنصر فيديو: استخدم نصاً افتراضياً مع مدة 5 ثوانٍ
      const currentText = captionBox.textContent || captionBox.innerText;
      if (currentText && currentText.trim()) {
        const vttData = { start: 0, end: 5, text: currentText };
        startSingleWordSync(captionBox, template, vttData, words);
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
      startSingleWordSync(captionBox, template, vttData, words);
    }
  }
  
  // إعادة إنشاء المقابض بعد تطبيق القالب
  setTimeout(() => {
    if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
      window.CaptionSystem.ensureResizeHandles();
    }
  }, 100);
}

// بدء التزامن مع الصوت لقالب الكلمة الواحدة المتزامنة
function startSingleWordSync(captionBox, template, vttData, words) {
  if (!template.singleWordMode?.syncWithAudio || !vttData) return;
  
  stopSingleWordSync(); // إيقاف أي تزامن سابق
  
  // الحصول على جميع عناصر الكلمات
  singleWordElements = captionBox.querySelectorAll('.single-word-sync-container');
  if (singleWordElements.length === 0) return;
  
  isSingleWordSyncActive = true;
  currentSingleWordIndex = -1;
  
  // بدء التزامن مع الفيديو
  syncSingleWordWithVideo(template, vttData, words);
}

// إيقاف التزامن مع الصوت لقالب الكلمة الواحدة المتزامنة
function stopSingleWordSync() {
  if (singleWordSyncInterval) {
    clearInterval(singleWordSyncInterval);
    singleWordSyncInterval = null;
  }
  
  isSingleWordSyncActive = false;
  currentSingleWordIndex = 0;
  singleWordElements = [];
}

// التزامن مع الفيديو لقالب الكلمة الواحدة المتزامنة
function syncSingleWordWithVideo(template, vttData, words) {
  if (!isSingleWordSyncActive || !vttData) return;
  
  const video = document.querySelector('video');
  if (!video) return;
  
  // حساب مدة كل كلمة بناءً على مدة الكابشن
  const totalDuration = vttData.end - vttData.start;
  const wordDuration = totalDuration / words.length;
  
  // تحديث النص بناءً على وقت الفيديو
  const updateSingleWord = () => {
    if (!isSingleWordSyncActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      let newWordIndex;
      
      // حساب فهرس الكلمة الحالية
      newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
      
      // لا نعيد الرسم إلا إذا تغيرت الكلمة
      if (newWordIndex !== currentSingleWordIndex) {
        currentSingleWordIndex = newWordIndex;
        updateSingleWordDisplay(newWordIndex, words, template);
      }
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء النص
      if (currentSingleWordIndex !== -1) {
        currentSingleWordIndex = -1;
        updateSingleWordDisplay(-1, words, template);
      }
    } else {
      // بعد نهاية الكابشن - إظهار الكلمة الأخيرة
      if (currentSingleWordIndex !== words.length - 1) {
        currentSingleWordIndex = words.length - 1;
        updateSingleWordDisplay(words.length - 1, words, template);
      }
    }
  };
  
  // تحديث كل 16ms للحصول على تزامن أكثر دقة (60fps)
  singleWordSyncInterval = setInterval(updateSingleWord, 16);
  
  // تحديث فوري
  updateSingleWord();
}

// تحديث عرض الكلمة الواحدة المتزامنة
function updateSingleWordDisplay(wordIndex, words, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.single-word-sync-container');
  if (!textContainer) return;
  
  // مسح النص الحالي
  textContainer.innerHTML = '';
  
  // إظهار الكلمة الحالية فقط
  if (wordIndex >= 0 && wordIndex < words.length) {
    const wordSpan = document.createElement('span');
    wordSpan.textContent = words[wordIndex];
    wordSpan.className = 'single-word-element';
    wordSpan.style.cssText = `
      display: inline-block;
      font-family: ${template.fontFamily};
      font-size: ${template.fontSize};
      font-weight: ${template.fontWeight};
      color: ${template.singleWordMode?.highlightColor || '#ffff00'};
      text-shadow: ${template.textShadow || '3px 3px 8px rgba(0, 0, 0, 0.9)'};
      text-align: center;
      transition: all ${template.singleWordMode?.transitionDuration || '0.3s'} ease;
      animation: ${template.animation || 'singleWordAppear'} ${template.singleWordMode?.transitionDuration || '0.3s'} ease-out;
    `;
    
    textContainer.appendChild(wordSpan);
  }
}

// دالة تقسيم النص إلى كلمات (مستوردة من word-highlight.js)
function splitTextIntoWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(word => word.length > 0);
}

// تصدير دوال قالب الكلمة الواحدة للنطاق العام
window.SingleWordSync = {
  applySingleWordSyncTemplate,
  startSingleWordSync,
  stopSingleWordSync,
  syncSingleWordWithVideo,
  updateSingleWordDisplay,
  splitTextIntoWords,
  // متغيرات النظام
  getSingleWordSyncInterval: () => singleWordSyncInterval,
  getCurrentSingleWordIndex: () => currentSingleWordIndex,
  getSingleWordElements: () => singleWordElements,
  getIsSingleWordSyncActive: () => isSingleWordSyncActive
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.singleWordSyncInterval = singleWordSyncInterval;
window.currentSingleWordIndex = currentSingleWordIndex;
window.singleWordElements = singleWordElements;
window.isSingleWordSyncActive = isSingleWordSyncActive;
window.applySingleWordSyncTemplate = applySingleWordSyncTemplate;
window.stopSingleWordSync = stopSingleWordSync;
