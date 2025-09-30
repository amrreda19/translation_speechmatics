// ملف نظام المرحلتين للقوالب العادية
// Two Phase System Module

// متغيرات نظام المرحلتين للقوالب العادية
let twoPhaseSyncInterval = null;
let currentTwoPhaseWordIndex = 0;
let twoPhaseWordElements = [];
let isTwoPhaseSyncActive = false;

// تطبيق نظام المرحلتين على باقي القوالب
function applyTwoPhaseTemplate(captionBox, template) {
  if (!captionBox || !template) return;
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // تقسيم النص إلى كلمات
  const words = splitTextIntoWords(text);
  if (words.length === 0) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء حاوية للنص
  const textContainer = document.createElement('div');
  textContainer.className = 'two-phase-text-container';
  textContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 2px;
    width: 100%;
  `;
  
  captionBox.appendChild(textContainer);
  
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
        startTwoPhaseSync(captionBox, template, vttData, words);
      }
    }
  }
}

// بدء التزامن مع الصوت للقوالب العادية
function startTwoPhaseSync(captionBox, template, vttData, words) {
  if (!vttData) return;
  
  stopTwoPhaseSync(); // إيقاف أي تزامن سابق
  
  // الحصول على جميع عناصر الكلمات
  twoPhaseWordElements = captionBox.querySelectorAll('.two-phase-text-container');
  if (twoPhaseWordElements.length === 0) return;
  
  isTwoPhaseSyncActive = true;
  currentTwoPhaseWordIndex = -1;
  
  // بدء التزامن مع الفيديو
  syncTwoPhaseWithVideo(template, vttData, words);
}

// إيقاف التزامن مع الصوت للقوالب العادية
function stopTwoPhaseSync() {
  if (twoPhaseSyncInterval) {
    clearInterval(twoPhaseSyncInterval);
    twoPhaseSyncInterval = null;
  }
  
  isTwoPhaseSyncActive = false;
  currentTwoPhaseWordIndex = 0;
  twoPhaseWordElements = [];
}

// التزامن مع الفيديو للقوالب العادية
function syncTwoPhaseWithVideo(template, vttData, words) {
  if (!isTwoPhaseSyncActive || !vttData) return;
  
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
  
  // تحديث النص بناءً على وقت الفيديو
  const updateText = () => {
    if (!isTwoPhaseSyncActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      let newWordIndex;
      
      // حساب فهرس الكلمة الحالية
      newWordIndex = Math.min(Math.floor(relativeTime / wordDuration), words.length - 1);
      
      // تحديث عرض النص مع دعم المرحلتين
      updateTwoPhaseDisplay(newWordIndex, words, firstPhaseWords, secondPhaseWords, template);
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء النص
      updateTwoPhaseDisplay(-1, words, firstPhaseWords, secondPhaseWords, template);
    } else {
      // بعد نهاية الكابشن - إظهار جميع الكلمات
      updateTwoPhaseDisplay(words.length - 1, words, firstPhaseWords, secondPhaseWords, template);
    }
  };
  
  // تحديث كل 16ms للحصول على تزامن أكثر دقة (60fps)
  twoPhaseSyncInterval = setInterval(updateText, 16);
  
  // تحديث فوري
  updateText();
}

// تحديث عرض النص مع دعم المرحلتين
function updateTwoPhaseDisplay(wordIndex, allWords, firstPhaseWords, secondPhaseWords, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.two-phase-text-container');
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
    
    wordsInCurrentPhase.forEach((word, index) => {
      if (index <= relativeWordIndex) {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        wordSpan.style.cssText = `
          display: inline-block;
          margin: 0 2px;
          padding: 0;
          transition: all 0.1s ease;
          ${index === relativeWordIndex ? 'transform: scale(1.05);' : ''}
        `;
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

// تصدير دوال نظام المرحلتين للنطاق العام
window.TwoPhaseSystem = {
  applyTwoPhaseTemplate,
  startTwoPhaseSync,
  stopTwoPhaseSync,
  syncTwoPhaseWithVideo,
  updateTwoPhaseDisplay,
  splitTextIntoWords,
  // متغيرات النظام
  getTwoPhaseSyncInterval: () => twoPhaseSyncInterval,
  getCurrentTwoPhaseWordIndex: () => currentTwoPhaseWordIndex,
  getTwoPhaseWordElements: () => twoPhaseWordElements,
  getIsTwoPhaseSyncActive: () => isTwoPhaseSyncActive
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.twoPhaseSyncInterval = twoPhaseSyncInterval;
window.currentTwoPhaseWordIndex = currentTwoPhaseWordIndex;
window.twoPhaseWordElements = twoPhaseWordElements;
window.isTwoPhaseSyncActive = isTwoPhaseSyncActive;
window.applyTwoPhaseTemplate = applyTwoPhaseTemplate;
