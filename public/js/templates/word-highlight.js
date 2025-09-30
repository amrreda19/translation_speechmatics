// ملف نظام الهايلايت كلمة بكلمة
// Word Highlight System Module

// متغيرات نظام الهايلايت كلمة بكلمة
let wordHighlightInterval = null;
let currentWordIndex = 0;
let wordElements = [];
let isWordHighlightActive = false;

// تقسيم النص إلى كلمات منفصلة
function splitTextIntoWords(text) {
  if (!text) return [];
  // تقسيم النص إلى كلمات مع الحفاظ على علامات الترقيم
  return text.trim().split(/\s+/).filter(word => word.length > 0);
}

// إنشاء عناصر الكلمات مع الهايلايت
function createWordElements(text, template) {
  const words = splitTextIntoWords(text);
  const wordHighlight = template.wordHighlight;
  
  return words.map((word, index) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.className = 'word-element';
    span.dataset.wordIndex = index;
    
    // تطبيق الأنماط الأساسية
    span.style.cssText = `
      display: inline-block;
      margin: 0 2px;
      padding: 2px 4px;
      border-radius: 3px;
      transition: all ${wordHighlight?.transitionDuration || '0.3s'} ease-in-out;
      cursor: pointer;
      background-color: transparent !important;
    `;
    
    return span;
  });
}

// تطبيق الهايلايت على كلمة محددة
function highlightWord(wordIndex, template) {
  if (!wordElements || wordElements.length === 0) return;
  
  // إزالة الهايلايت من جميع الكلمات
  wordElements.forEach((wordEl, index) => {
    wordEl.style.setProperty('background-color', 'transparent', 'important');
    wordEl.style.setProperty('color', template.textColor, 'important');
    wordEl.style.setProperty('text-shadow', template.textShadow || '2px 2px 6px rgba(0, 0, 0, 0.9)', 'important');
    wordEl.style.setProperty('transform', 'scale(1)', 'important');
    wordEl.style.setProperty('box-shadow', 'none', 'important');
    wordEl.classList.remove('highlighted');
  });
  
  // تطبيق الهايلايت على الكلمة المحددة
  if (wordIndex >= 0 && wordIndex < wordElements.length) {
    const wordEl = wordElements[wordIndex];
    const wordHighlight = template.wordHighlight;
    
    // تطبيق التأثيرات حسب نوع القالب
    if (template.id === 'yellow-sync-highlight') {
      // للقالب الجديد: الكلمة نفسها تصبح صفراء بدون خلفية
      wordEl.style.setProperty('background-color', 'transparent', 'important');
      wordEl.style.setProperty('color', wordHighlight?.highlightColor || '#ffff00', 'important');
      wordEl.style.setProperty('text-shadow', `0 0 8px ${wordHighlight?.highlightColor || '#ffff00'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
      wordEl.style.setProperty('transform', 'scale(1.1)', 'important');
      wordEl.style.setProperty('box-shadow', 'none', 'important');
      wordEl.classList.add('highlighted');
    } else if (template.id === 'wave-text-pink') {
      // للقالب البنفسجي: تطبيق تأثير الموجة البنفسجي
      wordEl.style.setProperty('background-color', 'transparent', 'important');
      wordEl.style.setProperty('color', wordHighlight?.highlightColor || '#7f6ee0', 'important');
      wordEl.style.setProperty('text-shadow', `0 0 15px ${wordHighlight?.highlightColor || '#7f6ee0'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
      wordEl.style.setProperty('transform', 'translateY(-8px) scale(1.1)', 'important');
      wordEl.style.setProperty('box-shadow', 'none', 'important');
      wordEl.style.setProperty('animation', 'waveTextPink 0.8s ease-in-out', 'important');
      wordEl.classList.add('highlighted');
    } else if (template.id === 'scale-text-green') {
      // للقالب الأخضر: تطبيق تأثير التكبير والتصغير الأخضر
      wordEl.style.setProperty('background-color', 'transparent', 'important');
      wordEl.style.setProperty('color', wordHighlight?.highlightColor || '#00ff41', 'important');
      wordEl.style.setProperty('text-shadow', `0 0 20px ${wordHighlight?.highlightColor || '#00ff41'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
      wordEl.style.setProperty('transform', 'scale(1.5)', 'important');
      wordEl.style.setProperty('box-shadow', 'none', 'important');
      wordEl.style.setProperty('animation', 'scaleTextGreen 0.6s ease-in-out', 'important');
      wordEl.classList.add('highlighted');
    } else {
      // للقالب القديم: خلفية حمراء
      wordEl.style.backgroundColor = wordHighlight?.highlightBackground || 'rgba(255, 0, 0, 0.3)';
      wordEl.style.color = wordHighlight?.highlightColor || '#ff0000';
      wordEl.style.textShadow = template.textShadow || '2px 2px 6px rgba(0, 0, 0, 0.9)';
      wordEl.style.transform = 'scale(1.05)';
      wordEl.classList.add('highlighted');
    }
  }
}

// بدء نظام الهايلايت كلمة بكلمة
function startWordHighlight(captionBox, template, vttData) {
  if (!captionBox || !template || !template.wordHighlight?.enabled) return;
  
  stopWordHighlight(); // إيقاف أي هايلايت سابق
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // تقسيم النص إلى كلمات
  const words = splitTextIntoWords(text);
  if (words.length === 0) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء حاوية للنص مع نظام المراحل المتعددة
  const textContainer = document.createElement('div');
  textContainer.className = 'word-highlight-phase-container';
  textContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 2px;
    width: 100%;
  `;
  
  captionBox.appendChild(textContainer);
  
  // تطبيق الأنماط الخاصة بالهايلايت
  captionBox.style.width = 'auto';
  captionBox.style.maxWidth = '95%';
  captionBox.style.minWidth = '200px';
  captionBox.style.display = 'inline-block';
  
  // إضافة مسافة بين الكلمات
  if (template.wordHighlight?.wordSpacing) {
    captionBox.style.letterSpacing = template.wordHighlight.wordSpacing;
  }
  
  // إعادة إنشاء المقابض بعد تطبيق الهايلايت
  setTimeout(() => {
    if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
      window.CaptionSystem.ensureResizeHandles();
    }
  }, 100);
  
  isWordHighlightActive = true;
  currentWordIndex = 0;
  
  // بدء التزامن مع الفيديو مع دعم المراحل المتعددة
  syncWordHighlightWithVideoPhases(template, vttData, words);
}

// إيقاف نظام الهايلايت
function stopWordHighlight() {
  if (wordHighlightInterval) {
    clearInterval(wordHighlightInterval);
    wordHighlightInterval = null;
  }
  
  isWordHighlightActive = false;
  currentWordIndex = 0;
  wordElements = [];
  
  // تنظيف النص من عناصر الهايلايت
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (captionBox) {
    // إزالة كلاس الهايلايت
    captionBox.classList.remove('word-highlight-mode', 'yellow-sync-highlight', 'wave-text-pink', 'scale-text-green');
    
    // إزالة جميع عناصر الكلمات وإعادة النص الأصلي
    const wordElements = captionBox.querySelectorAll('.word-element');
    if (wordElements.length > 0) {
      // جمع النص من جميع عناصر الكلمات
      const originalText = Array.from(wordElements).map(el => el.textContent).join(' ');
      captionBox.innerHTML = originalText;
    }
    
    // إعادة تعيين الأنماط للعرض العادي
    captionBox.style.width = '';
    captionBox.style.maxWidth = '';
    captionBox.style.minWidth = '';
    captionBox.style.display = '';
    
    // إعادة إنشاء المقابض بعد إيقاف الهايلايت
    setTimeout(() => {
      if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
        window.CaptionSystem.ensureResizeHandles();
      }
    }, 100);
  }
}

// التزامن مع الفيديو
function syncWordHighlightWithVideo(template, vttData) {
  if (!isWordHighlightActive || !vttData) return;
  
  const video = document.querySelector('video');
  if (!video) return;
  
  // حساب مدة كل كلمة بناءً على مدة الكابشن
  const totalDuration = vttData.end - vttData.start;
  const wordDuration = totalDuration / wordElements.length;
  
  // تحديث الهايلايت بناءً على وقت الفيديو
  const updateHighlight = () => {
    if (!isWordHighlightActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      // حساب فهرس الكلمة مع ضمان أن الكلمة الأولى تظهر فوراً
      let newWordIndex;
      if (relativeTime < wordDuration) {
        newWordIndex = 0; // الكلمة الأولى تظهر فوراً
      } else {
        newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), wordElements.length - 1);
      }
      
      if (newWordIndex !== currentWordIndex && newWordIndex < wordElements.length) {
        currentWordIndex = newWordIndex;
        highlightWord(currentWordIndex, template);
      }
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن
      highlightWord(-1, template);
    } else {
      // بعد نهاية الكابشن
      highlightWord(-1, template);
    }
  };
  
  // تحديث كل 100ms
  wordHighlightInterval = setInterval(updateHighlight, 100);
  
  // تحديث فوري
  updateHighlight();
}

// التزامن مع الفيديو مع دعم المراحل المتعددة للهايلايت
function syncWordHighlightWithVideoPhases(template, vttData, words) {
  if (!isWordHighlightActive || !vttData) return;
  
  const video = document.querySelector('video');
  if (!video) return;
  
  // حساب مدة كل كلمة بناءً على مدة الكابشن
  const totalDuration = vttData.end - vttData.start;
  const wordDuration = totalDuration / words.length;
  
  // تحديد المراحل
  const maxWordsPerPhase = 4;
  const hasSecondPhase = words.length > maxWordsPerPhase;
  const firstPhaseWords = words.slice(0, maxWordsPerPhase);
  const secondPhaseWords = words.slice(maxWordsPerPhase);
  
  // تحديث الهايلايت بناءً على وقت الفيديو مع دعم المراحل
  const updateHighlight = () => {
    if (!isWordHighlightActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      // حساب فهرس الكلمة مع ضمان أن الكلمة الأولى تظهر فوراً
      let newWordIndex;
      if (relativeTime < wordDuration) {
        newWordIndex = 0; // الكلمة الأولى تظهر فوراً
      } else {
        newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
      }
      
      // تحديث عرض النص مع دعم المراحل المتعددة
      updateWordHighlightDisplayWithPhases(newWordIndex, words, firstPhaseWords, secondPhaseWords, template);
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء النص
      updateWordHighlightDisplayWithPhases(-1, words, firstPhaseWords, secondPhaseWords, template);
    } else {
      // بعد نهاية الكابشن - إظهار جميع الكلمات
      updateWordHighlightDisplayWithPhases(words.length - 1, words, firstPhaseWords, secondPhaseWords, template);
    }
  };
  
  // تحديث كل 16ms للحصول على تزامن أكثر دقة (60fps)
  wordHighlightInterval = setInterval(updateHighlight, 16);
  
  // تحديث فوري
  updateHighlight();
}

// تحديث عرض الهايلايت مع دعم المراحل المتعددة
function updateWordHighlightDisplayWithPhases(wordIndex, allWords, firstPhaseWords, secondPhaseWords, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.word-highlight-phase-container');
  if (!textContainer) return;
  
  const maxWordsPerPhase = 4;
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
    
    // إظهار جميع الكلمات في المرحلة الحالية مرة واحدة
    wordsInCurrentPhase.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.textContent = word;
      wordSpan.className = 'word-element';
      wordSpan.dataset.wordIndex = index;
      
      // تطبيق الأنماط الأساسية
      wordSpan.style.cssText = `
        display: inline-block;
        margin: 0 2px;
        padding: 2px 4px;
        border-radius: 3px;
        transition: all ${template.wordHighlight?.transitionDuration || '0.3s'} ease-in-out;
        cursor: pointer;
      `;
      
      // تطبيق الهايلايت حسب نوع القالب
      if (template.id === 'yellow-sync-highlight') {
        // للقالب الأصفر: جميع الكلمات تظهر باللون الأبيض، الكلمة الحالية باللون الأصفر
        if (index === relativeWordIndex) {
          // الكلمة الحالية: أصفر مع تأثير
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.wordHighlight?.highlightColor || '#ffff00', 'important');
          wordSpan.style.setProperty('text-shadow', `0 0 8px ${template.wordHighlight?.highlightColor || '#ffff00'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
          wordSpan.style.setProperty('transform', 'scale(1.1)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
          wordSpan.classList.add('highlighted');
        } else {
          // الكلمات الأخرى: أبيض عادي
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.textColor || '#ffffff', 'important');
          wordSpan.style.setProperty('text-shadow', template.textShadow || '2px 2px 4px rgba(0, 0, 0, 0.8)', 'important');
          wordSpan.style.setProperty('transform', 'scale(1)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
        }
      } else if (template.id === 'wave-text-pink') {
        // للقالب البنفسجي: جميع الكلمات تظهر باللون الأبيض، الكلمة الحالية باللون البنفسجي مع تأثير الموجة
        if (index === relativeWordIndex) {
          // الكلمة الحالية: بنفسجي مع تأثير الموجة
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.wordHighlight?.highlightColor || '#7f6ee0', 'important');
          wordSpan.style.setProperty('text-shadow', `0 0 15px ${template.wordHighlight?.highlightColor || '#7f6ee0'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
          wordSpan.style.setProperty('transform', 'translateY(-8px) scale(1.1)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
          wordSpan.style.setProperty('animation', 'waveTextPink 0.8s ease-in-out', 'important');
          wordSpan.classList.add('highlighted');
        } else {
          // الكلمات الأخرى: أبيض عادي
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.textColor || '#ffffff', 'important');
          wordSpan.style.setProperty('text-shadow', template.textShadow || '2px 2px 4px rgba(0, 0, 0, 0.8)', 'important');
          wordSpan.style.setProperty('transform', 'scale(1)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
        }
      } else if (template.id === 'scale-text-green') {
        // للقالب الأخضر: جميع الكلمات تظهر باللون الأبيض، الكلمة الحالية باللون الأخضر مع تأثير التكبير والتصغير
        if (index === relativeWordIndex) {
          // الكلمة الحالية: أخضر مع تأثير التكبير والتصغير
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.wordHighlight?.highlightColor || '#00ff41', 'important');
          wordSpan.style.setProperty('text-shadow', `0 0 20px ${template.wordHighlight?.highlightColor || '#00ff41'}, 2px 2px 4px rgba(0, 0, 0, 0.8)`, 'important');
          wordSpan.style.setProperty('transform', 'scale(1.5)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
          wordSpan.style.setProperty('animation', 'scaleTextGreen 0.6s ease-in-out', 'important');
          wordSpan.classList.add('highlighted');
        } else {
          // الكلمات الأخرى: أبيض عادي مع حجم أصغر
          wordSpan.style.setProperty('background-color', 'transparent', 'important');
          wordSpan.style.setProperty('color', template.textColor || '#ffffff', 'important');
          wordSpan.style.setProperty('text-shadow', template.textShadow || '2px 2px 4px rgba(0, 0, 0, 0.8)', 'important');
          wordSpan.style.setProperty('transform', 'scale(0.8)', 'important');
          wordSpan.style.setProperty('box-shadow', 'none', 'important');
          wordSpan.style.setProperty('opacity', '0.7', 'important');
        }
      } else {
        // للقالب الأحمر: جميع الكلمات تظهر باللون الأبيض، الكلمة الحالية باللون الأحمر
        if (index === relativeWordIndex) {
          // الكلمة الحالية: أحمر مع خلفية
          wordSpan.style.backgroundColor = template.wordHighlight?.highlightBackground || 'rgba(255, 0, 0, 0.3)';
          wordSpan.style.color = template.wordHighlight?.highlightColor || '#ff0000';
          wordSpan.style.textShadow = template.textShadow || '2px 2px 6px rgba(0, 0, 0, 0.9)';
          wordSpan.style.transform = 'scale(1.05)';
          wordSpan.classList.add('highlighted');
        } else {
          // الكلمات الأخرى: أبيض عادي
          wordSpan.style.backgroundColor = 'transparent';
          wordSpan.style.color = template.textColor || '#ffffff';
          wordSpan.style.textShadow = template.textShadow || '2px 2px 4px rgba(0, 0, 0, 0.8)';
          wordSpan.style.transform = 'scale(1)';
        }
      }
      
      textContainer.appendChild(wordSpan);
    });
  }
}

// تصدير دوال نظام الهايلايت للنطاق العام
window.WordHighlight = {
  splitTextIntoWords,
  createWordElements,
  highlightWord,
  startWordHighlight,
  stopWordHighlight,
  syncWordHighlightWithVideo,
  syncWordHighlightWithVideoPhases,
  updateWordHighlightDisplayWithPhases,
  // متغيرات النظام
  getWordHighlightInterval: () => wordHighlightInterval,
  getCurrentWordIndex: () => currentWordIndex,
  getWordElements: () => wordElements,
  getIsWordHighlightActive: () => isWordHighlightActive
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.wordHighlightInterval = wordHighlightInterval;
window.currentWordIndex = currentWordIndex;
window.wordElements = wordElements;
window.isWordHighlightActive = isWordHighlightActive;
window.startWordHighlight = startWordHighlight;
window.stopWordHighlight = stopWordHighlight;
