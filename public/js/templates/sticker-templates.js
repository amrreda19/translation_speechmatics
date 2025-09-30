// ملف قالب الملصقات الملونة
// Sticker Templates Module

// متغيرات قالب الملصقات
let stickerColorIndex = 0;
let stickerSyncInterval = null;
let currentStickerWordIndex = 0;
let stickerWordElements = [];
let isStickerSyncActive = false;

// تطبيق قالب الملصقات الملونة
function applyStickerTemplate(captionBox, template, vttData = null) {
  if (!captionBox || !template || !template.stickerMode?.enabled) return;
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // تقسيم النص إلى كلمات
  const words = splitTextIntoWords(text);
  if (words.length === 0) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء شبكة 2×2
  const gridContainer = document.createElement('div');
  gridContainer.className = 'sticker-grid';
  gridContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${template.stickerMode.lineGap || template.stickerMode.wordBoxMargin || '12px'};
  `;
  
  // إنشاء السطر الأول (كلمتين)
  const firstRow = createStickerRow([], template); // فارغ في البداية
  gridContainer.appendChild(firstRow);
  
  // إنشاء السطر الثاني (كلمتين)
  const secondRow = createStickerRow([], template); // فارغ في البداية
  gridContainer.appendChild(secondRow);
  
  captionBox.appendChild(gridContainer);
  
  // بدء التزامن مع الصوت إذا كان مفعلاً
  if (template.stickerMode.syncWithAudio && vttData) {
    startStickerSync(captionBox, template, vttData, words);
  }
  
  // إعادة إنشاء المقابض
  setTimeout(() => {
    if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
      window.CaptionSystem.ensureResizeHandles();
    }
  }, 100);
}

// إنشاء سطر من الملصقات
function createStickerRow(words, template) {
  const row = document.createElement('div');
  row.className = 'sticker-row';
  row.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${template.stickerMode.wordGap || template.stickerMode.wordBoxMargin || '8px'};
  `;
  
  // إنشاء مكانين للكلمات (حتى لو كانت فارغة)
  for (let i = 0; i < 2; i++) {
    const wordBox = document.createElement('div');
    wordBox.className = 'sticker-word-box';
    wordBox.style.cssText = `
      background-color: transparent;
      color: transparent;
      padding: 2px 6px;
      border-radius: ${template.stickerMode.wordBoxBorderRadius || '8px'};
      font-family: ${template.fontFamily};
      font-size: ${template.fontSize};
      font-weight: ${template.fontWeight};
      text-align: center;
      line-height: 1;
      white-space: nowrap;
      box-shadow: none;
      transition: none;
      cursor: pointer;
      user-select: none;
      width: fit-content;
      opacity: 0;
      visibility: hidden;
      transform: scale(0.3);
    `;
    row.appendChild(wordBox);
  }
  
  return row;
}

// إنشاء صندوق الكلمة
function createWordBox(word, template) {
  const wordBox = document.createElement('div');
  wordBox.className = 'sticker-word-box';
  
  // الحصول على اللون التالي
  const color = getNextStickerColor(template);
  
  // تطبيق الأنماط
  wordBox.style.cssText = `
    background-color: ${color.background};
    color: ${color.text};
    padding: 2px 6px;
    border-radius: ${template.stickerMode.wordBoxBorderRadius || '8px'};
    font-family: ${template.fontFamily};
    font-size: ${template.fontSize};
    font-weight: ${template.fontWeight};
    text-align: center;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
    cursor: pointer;
    user-select: none;
    width: fit-content;
  `;
  
  wordBox.textContent = word;
  
  // إضافة تأثير hover
  wordBox.addEventListener('mouseenter', () => {
    wordBox.style.transform = 'scale(1.05)';
  });
  
  wordBox.addEventListener('mouseleave', () => {
    wordBox.style.transform = 'scale(1)';
  });
  
  return wordBox;
}

// الحصول على اللون التالي للملصق
function getNextStickerColor(template) {
  const colors = template.stickerMode.colors || [];
  if (colors.length === 0) {
    return { background: '#305F39', text: '#C1D3A2' };
  }
  
  let color;
  if (template.stickerMode.colorMode === 'random') {
    // اختيار لون عشوائي
    color = colors[Math.floor(Math.random() * colors.length)];
  } else {
    // اختيار لون بالتتابع
    color = colors[stickerColorIndex % colors.length];
    stickerColorIndex++;
  }
  
  return color;
}

// الحصول على اللون حسب الفهرس المحدد
function getStickerColorByIndex(template, wordIndex) {
  const colors = template.stickerMode.colors || [];
  if (colors.length === 0) {
    return { background: '#305F39', text: '#C1D3A2' };
  }
  
  if (template.stickerMode.colorMode === 'random') {
    // اختيار لون عشوائي بناءً على الفهرس
    return colors[wordIndex % colors.length];
  } else {
    // اختيار لون بالتتابع بناءً على الفهرس
    return colors[wordIndex % colors.length];
  }
}

// إعادة تعيين فهرس الألوان
function resetStickerColorIndex() {
  stickerColorIndex = 0;
}

// بدء التزامن مع الصوت للملصقات
function startStickerSync(captionBox, template, vttData, words) {
  if (!template.stickerMode?.syncWithAudio || !vttData) return;
  
  stopStickerSync(); // إيقاف أي تزامن سابق
  
  // الحصول على جميع عناصر الكلمات
  stickerWordElements = captionBox.querySelectorAll('.sticker-word-box');
  if (stickerWordElements.length === 0) return;
  
  isStickerSyncActive = true;
  currentStickerWordIndex = -1; // بدء من -1 لضمان عدم إظهار أي كلمة في البداية
  
  // إخفاء جميع الكلمات في البداية تماماً
  stickerWordElements.forEach(wordEl => {
    wordEl.style.opacity = '0';
    wordEl.style.transform = 'scale(0.3)';
    wordEl.style.transition = 'none'; // بدون انتقالات لتجنب التأخير
    wordEl.style.visibility = 'hidden';
  });
  
  // بدء التزامن مع الفيديو
  syncStickerWithVideo(template, vttData, words);
}

// إيقاف التزامن مع الصوت للملصقات
function stopStickerSync() {
  if (stickerSyncInterval) {
    clearInterval(stickerSyncInterval);
    stickerSyncInterval = null;
  }
  
  isStickerSyncActive = false;
  currentStickerWordIndex = 0;
  stickerWordElements = [];
}

// التزامن مع الفيديو للملصقات
function syncStickerWithVideo(template, vttData, words) {
  if (!isStickerSyncActive || !vttData) return;
  
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
  
  // تحديث الملصقات بناءً على وقت الفيديو
  const updateStickers = () => {
    if (!isStickerSyncActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      let newWordIndex;
      
      if (template.stickerMode?.showOnSpeak) {
        // إظهار الكلمة عند نطقها فقط - بدون أي تأخير
        if (relativeTime < 0) {
          newWordIndex = -1; // لا تظهر أي كلمة قبل بداية الكابشن
        } else {
          // حساب دقيق للكلمة الحالية
          newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
          
          // التأكد من أن الكلمة تظهر فوراً عند بداية وقتها
          if (relativeTime >= 0 && relativeTime < wordDuration && newWordIndex === 0) {
            newWordIndex = 0; // الكلمة الأولى تظهر فوراً
          }
        }
      } else {
        // العرض التقليدي بدون تأخير
        newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
      }
      
      // تحديث عرض الكلمات مع دعم المرحلتين
      updateStickerDisplayWithPhases(newWordIndex, words, firstPhaseWords, secondPhaseWords, template);
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء جميع الكلمات
      updateStickerDisplayWithPhases(-1, words, firstPhaseWords, secondPhaseWords, template);
    } else {
      // بعد نهاية الكابشن - إظهار جميع الكلمات
      updateStickerDisplayWithPhases(words.length - 1, words, firstPhaseWords, secondPhaseWords, template);
    }
  };
  
  // تحديث كل 16ms للحصول على تزامن أكثر دقة (60fps)
  stickerSyncInterval = setInterval(updateStickers, 16);
  
  // تحديث فوري
  updateStickers();
}

// تحديث عرض الملصقات مع دعم المرحلتين
function updateStickerDisplayWithPhases(wordIndex, allWords, firstPhaseWords, secondPhaseWords, template) {
  if (!stickerWordElements || stickerWordElements.length === 0) return;
  
  const maxWordsPerPhase = 4;
  const hasSecondPhase = allWords.length > maxWordsPerPhase;
  
  // تحديد المرحلة الحالية
  let currentPhase = 1;
  let wordsToShow = firstPhaseWords;
  
  if (hasSecondPhase && wordIndex >= maxWordsPerPhase) {
    currentPhase = 2;
    wordsToShow = secondPhaseWords;
  }
  
  // تحديث جميع الصناديق
  stickerWordElements.forEach((wordEl, index) => {
    // إخفاء جميع الصناديق أولاً
    wordEl.style.transition = 'none';
    wordEl.style.opacity = '0';
    wordEl.style.transform = 'scale(0.3)';
    wordEl.style.visibility = 'hidden';
    wordEl.style.backgroundColor = 'transparent';
    wordEl.style.color = 'transparent';
    wordEl.textContent = '';
  });
  
  // إظهار الكلمات المناسبة للمرحلة الحالية
  if (wordIndex >= 0) {
    const wordsInCurrentPhase = currentPhase === 1 ? firstPhaseWords : secondPhaseWords;
    const startIndex = currentPhase === 1 ? 0 : maxWordsPerPhase;
    const relativeWordIndex = wordIndex - startIndex;
    
    wordsInCurrentPhase.forEach((word, index) => {
      if (index <= relativeWordIndex && index < 4) {
        const wordEl = stickerWordElements[index];
        if (wordEl) {
          // حساب الفهرس الصحيح للون بناءً على موضع الكلمة في الجملة الكاملة
          const globalWordIndex = currentPhase === 1 ? index : index + 4;
          const color = getStickerColorByIndex(template, globalWordIndex);
          
          // إظهار الكلمة فوراً
          wordEl.style.transition = 'none';
          wordEl.style.opacity = '1';
          wordEl.style.transform = index === relativeWordIndex ? 'scale(1.1)' : 'scale(1)';
          wordEl.style.visibility = 'visible';
          wordEl.style.backgroundColor = color.background;
          wordEl.style.color = color.text;
          wordEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
          wordEl.textContent = word;
          
          // إضافة انتقال سريع بعد الإظهار الفوري
          setTimeout(() => {
            wordEl.style.transition = 'transform 0.1s ease';
          }, 10);
        }
      }
    });
  }
}

// تحديث عرض الملصقات (الدالة القديمة للتوافق)
function updateStickerDisplay(wordIndex) {
  if (!stickerWordElements || stickerWordElements.length === 0) return;
  
  stickerWordElements.forEach((wordEl, index) => {
    if (index <= wordIndex && wordIndex >= 0) {
      // إظهار الكلمة فوراً بدون انتقالات
      wordEl.style.transition = 'none';
      wordEl.style.opacity = '1';
      wordEl.style.transform = index === wordIndex ? 'scale(1.1)' : 'scale(1)';
      wordEl.style.visibility = 'visible';
      
      // إضافة انتقال سريع بعد الإظهار الفوري
      setTimeout(() => {
        wordEl.style.transition = 'transform 0.1s ease';
      }, 10);
    } else {
      // إخفاء الكلمة فوراً
      wordEl.style.transition = 'none';
      wordEl.style.opacity = '0';
      wordEl.style.transform = 'scale(0.3)';
      wordEl.style.visibility = 'hidden';
    }
  });
}

// دالة تقسيم النص إلى كلمات (مستوردة من word-highlight.js)
function splitTextIntoWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(word => word.length > 0);
}

// تصدير دوال قالب الملصقات للنطاق العام
window.StickerTemplates = {
  applyStickerTemplate,
  createStickerRow,
  createWordBox,
  getNextStickerColor,
  getStickerColorByIndex,
  resetStickerColorIndex,
  startStickerSync,
  stopStickerSync,
  syncStickerWithVideo,
  updateStickerDisplay,
  updateStickerDisplayWithPhases,
  splitTextIntoWords,
  // متغيرات النظام
  getStickerColorIndex: () => stickerColorIndex,
  getStickerSyncInterval: () => stickerSyncInterval,
  getCurrentStickerWordIndex: () => currentStickerWordIndex,
  getStickerWordElements: () => stickerWordElements,
  getIsStickerSyncActive: () => isStickerSyncActive
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.stickerColorIndex = stickerColorIndex;
window.stickerSyncInterval = stickerSyncInterval;
window.currentStickerWordIndex = currentStickerWordIndex;
window.stickerWordElements = stickerWordElements;
window.isStickerSyncActive = isStickerSyncActive;
window.applyStickerTemplate = applyStickerTemplate;
window.stopStickerSync = stopStickerSync;
