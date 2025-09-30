// ملف قالب الكتابة على الآلة الكاتبة العربية
// Arabic Typewriter Template Module

// متغيرات قالب الكتابة على الآلة الكاتبة العربية
let typewriterInterval = null;
let currentTypewriterCharIndex = 0;
let typewriterElements = [];
let isTypewriterActive = false;
let typewriterCursorElement = null;

// تطبيق قالب الكتابة على الآلة الكاتبة العربية
function applyArabicTypewriterTemplate(captionBox, template) {
  if (!captionBox || !template || !template.typewriterMode?.enabled) return;
  
  const text = captionBox.textContent || captionBox.innerText;
  if (!text) return;
  
  // مسح محتوى الكابشن
  captionBox.innerHTML = '';
  
  // إنشاء حاوية للنص مع دعم RTL وتحسينات الأداء
  const textContainer = document.createElement('div');
  textContainer.className = 'arabic-typewriter-container';
  textContainer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    direction: rtl;
    text-align: center;
    contain: layout style paint;
    will-change: contents;
  `;
  
  captionBox.appendChild(textContainer);
  
  // تطبيق الأنماط الخاصة بالقالب الجديد
  captionBox.style.width = 'auto';
  captionBox.style.maxWidth = '90%';
  captionBox.style.minWidth = '200px';
  captionBox.style.display = 'flex';
  captionBox.style.justifyContent = 'center';
  captionBox.style.alignItems = 'center';
  captionBox.style.direction = 'rtl';
  
  // إضافة كلاس خاص للقالب الجديد
  captionBox.classList.add('arabic-typewriter-mode');

  // حقن الأنميشن لهذا القالب فقط
  if (template.animation && window.TemplateCore && window.TemplateCore.getTemplates) {
    const templates = window.TemplateCore.getTemplates();
    if (templates?.animations?.[template.animation]?.keyframes) {
      window.TemplateCore.injectAnimationByName(template.animation);
    }
  }
  
  // حقن أنيميشن المؤشر
  if (template.typewriterMode?.blinkCursor && window.TemplateCore && window.TemplateCore.getTemplates) {
    const templates = window.TemplateCore.getTemplates();
    if (templates?.animations?.typewriterCursor?.keyframes) {
      window.TemplateCore.injectAnimationByName('typewriterCursor');
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
        startArabicTypewriter(captionBox, template, vttData, text);
      } else {
        // لا يوجد cue حالي: ابدأ بأول cue كحل افتراضي
        const firstCue = vttCues[0];
        if (firstCue) {
          const vttData = {
            start: firstCue.start,
            end: firstCue.end,
            text: firstCue.text
          };
          startArabicTypewriter(captionBox, template, vttData, text);
        }
      }
    } else {
      // لا يوجد عنصر فيديو: استخدم نصاً افتراضياً مع مدة 5 ثوانٍ
      const currentText = captionBox.textContent || captionBox.innerText;
      if (currentText && currentText.trim()) {
        const vttData = { start: 0, end: 5, text: currentText };
        startArabicTypewriter(captionBox, template, vttData, text);
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
      startArabicTypewriter(captionBox, template, vttData, text);
    }
  }
  
  // إعادة إنشاء المقابض بعد تطبيق القالب
  setTimeout(() => {
    if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
      window.CaptionSystem.ensureResizeHandles();
    }
  }, 100);
}

// بدء الكتابة على الآلة الكاتبة العربية
function startArabicTypewriter(captionBox, template, vttData, text) {
  if (!template.typewriterMode?.syncWithAudio || !vttData) return;
  
  stopArabicTypewriter(); // إيقاف أي تزامن سابق
  
  const textContainer = captionBox.querySelector('.arabic-typewriter-container');
  if (!textContainer) return;
  
  isTypewriterActive = true;
  currentTypewriterCharIndex = 0;
  
  // بدء التزامن مع الفيديو
  syncArabicTypewriterWithVideo(template, vttData, text);
}

// إيقاف الكتابة على الآلة الكاتبة العربية
function stopArabicTypewriter() {
  if (typewriterInterval) {
    clearInterval(typewriterInterval);
    typewriterInterval = null;
  }
  
  isTypewriterActive = false;
  currentTypewriterCharIndex = 0;
  typewriterElements = [];
  
  // إزالة المؤشر إذا كان موجوداً
  if (typewriterCursorElement) {
    typewriterCursorElement.remove();
    typewriterCursorElement = null;
  }
}

// التزامن مع الفيديو للكتابة على الآلة الكاتبة العربية مع دعم المرحلتين
function syncArabicTypewriterWithVideo(template, vttData, text) {
  if (!isTypewriterActive || !vttData) return;
  
  const video = document.querySelector('video');
  if (!video) return;
  
  // تقسيم النص إلى كلمات
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length === 0) return;
  
  // تحديد المراحل
  const maxWordsPerPhase = template.typewriterMode?.maxWordsPerPhase || 4;
  const hasSecondPhase = words.length > maxWordsPerPhase;
  const firstPhaseWords = words.slice(0, maxWordsPerPhase);
  const secondPhaseWords = words.slice(maxWordsPerPhase);
  
  // حساب مدة كل مرحلة
  const totalDuration = vttData.end - vttData.start;
  const firstPhaseDuration = hasSecondPhase ? totalDuration * 0.6 : totalDuration; // 60% للمرحلة الأولى
  const secondPhaseDuration = hasSecondPhase ? totalDuration * 0.4 : 0; // 40% للمرحلة الثانية
  
  // متغير لتخزين آخر وقت تم فيه التحديث
  let lastUpdateTime = 0;
  
  // تحديث النص بناءً على وقت الفيديو مع دعم المرحلتين
  const updateTypewriter = () => {
    if (!isTypewriterActive) return;
    
    const currentTime = video.currentTime;
    const relativeTime = currentTime - vttData.start;
    
    // تحديث أقل تكراراً لتقليل الاهتزاز
    const timeSinceLastUpdate = currentTime - lastUpdateTime;
    if (timeSinceLastUpdate < 0.05) return; // تحديث كل 50ms كحد أدنى
    
    if (relativeTime >= 0 && relativeTime <= totalDuration) {
      let currentPhase = 1;
      let currentWords = firstPhaseWords;
      let phaseStartTime = 0;
      let phaseDuration = firstPhaseDuration;
      
      // تحديد المرحلة الحالية
      if (hasSecondPhase && relativeTime >= firstPhaseDuration) {
        currentPhase = 2;
        currentWords = secondPhaseWords;
        phaseStartTime = firstPhaseDuration;
        phaseDuration = secondPhaseDuration;
      }
      
      // حساب فهرس الحرف الحالي في المرحلة الحالية
      const phaseRelativeTime = relativeTime - phaseStartTime;
      const currentText = currentWords.join(' ');
      const charDuration = phaseDuration / currentText.length;
      const newCharIndex = Math.min(Math.floor(phaseRelativeTime / charDuration), currentText.length - 1);
      
      // تحديث العرض مع المرحلة الحالية
      if (newCharIndex !== currentTypewriterCharIndex && newCharIndex >= 0) {
        currentTypewriterCharIndex = newCharIndex;
        updateArabicTypewriterDisplayWithPhases(newCharIndex, currentWords, currentPhase, template);
        lastUpdateTime = currentTime;
      }
    } else if (relativeTime < 0) {
      // قبل بداية الكابشن - إخفاء النص
      if (currentTypewriterCharIndex !== -1) {
        currentTypewriterCharIndex = -1;
        updateArabicTypewriterDisplayWithPhases(-1, firstPhaseWords, 1, template);
        lastUpdateTime = currentTime;
      }
    } else {
      // بعد نهاية الكابشن - إظهار جميع الأحرف في المرحلة الأخيرة
      if (hasSecondPhase) {
        const finalText = secondPhaseWords.join(' ');
        if (currentTypewriterCharIndex !== finalText.length - 1) {
          currentTypewriterCharIndex = finalText.length - 1;
          updateArabicTypewriterDisplayWithPhases(finalText.length - 1, secondPhaseWords, 2, template);
          lastUpdateTime = currentTime;
        }
      } else {
        const finalText = firstPhaseWords.join(' ');
        if (currentTypewriterCharIndex !== finalText.length - 1) {
          currentTypewriterCharIndex = finalText.length - 1;
          updateArabicTypewriterDisplayWithPhases(finalText.length - 1, firstPhaseWords, 1, template);
          lastUpdateTime = currentTime;
        }
      }
    }
  };
  
  // تحديث كل 50ms بدلاً من 16ms لتقليل الاهتزاز
  typewriterInterval = setInterval(updateTypewriter, 50);
  
  // تحديث فوري
  updateTypewriter();
}

// تحديث عرض الكتابة على الآلة الكاتبة العربية مع دعم المرحلتين
function updateArabicTypewriterDisplayWithPhases(charIndex, words, phase, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.arabic-typewriter-container');
  if (!textContainer) return;
  
  // إظهار الأحرف المكتوبة حتى الآن
  if (charIndex >= 0) {
    const currentText = words.join(' ');
    const visibleText = currentText.substring(0, charIndex + 1);
    
    // التحقق من وجود عنصر النص وتحديثه بدلاً من إعادة إنشائه
    let textSpan = textContainer.querySelector('.typewriter-text');
    if (!textSpan) {
      textSpan = document.createElement('span');
      textSpan.className = 'typewriter-text';
      textSpan.style.cssText = `
        display: inline-block;
        font-family: ${template.fontFamily};
        font-size: ${template.fontSize};
        font-weight: ${template.fontWeight};
        color: ${template.textColor};
        text-shadow: ${template.textShadow || '2px 2px 6px rgba(0, 0, 0, 0.9)'};
        text-align: center;
        direction: rtl;
        transition: none;
        will-change: contents;
      `;
      textContainer.appendChild(textSpan);
    }
    
    // تحديث النص فقط إذا تغير
    if (textSpan.textContent !== visibleText) {
      textSpan.textContent = visibleText;
    }
    
    // إضافة المؤشر إذا كان مفعلاً ولم يكن موجوداً
    if (template.typewriterMode?.blinkCursor && !typewriterCursorElement) {
      const cursorSpan = document.createElement('span');
      cursorSpan.textContent = '|';
      cursorSpan.className = 'typewriter-cursor';
      cursorSpan.style.cssText = `
        display: inline-block;
        color: ${template.typewriterMode?.cursorColor || '#ffff00'};
        font-size: ${template.fontSize};
        font-weight: ${template.fontWeight};
        margin-right: 2px;
        animation: typewriterCursor ${template.typewriterMode?.cursorBlinkSpeed || '1s'} linear infinite;
        will-change: opacity;
      `;
      
      textContainer.appendChild(cursorSpan);
      typewriterCursorElement = cursorSpan;
    }
  } else {
    // إخفاء النص والمؤشر إذا كان charIndex سالب
    const textSpan = textContainer.querySelector('.typewriter-text');
    if (textSpan) {
      textSpan.textContent = '';
    }
    if (typewriterCursorElement) {
      typewriterCursorElement.remove();
      typewriterCursorElement = null;
    }
  }
}

// تحديث عرض الكتابة على الآلة الكاتبة العربية (الدالة القديمة للتوافق)
function updateArabicTypewriterDisplay(charIndex, text, template) {
  const captionBox = window.captionBox || document.getElementById('captionBox');
  if (!captionBox) return;
  
  const textContainer = captionBox.querySelector('.arabic-typewriter-container');
  if (!textContainer) return;
  
  // إظهار الأحرف المكتوبة حتى الآن
  if (charIndex >= 0) {
    const visibleText = text.substring(0, charIndex + 1);
    
    // التحقق من وجود عنصر النص وتحديثه بدلاً من إعادة إنشائه
    let textSpan = textContainer.querySelector('.typewriter-text');
    if (!textSpan) {
      textSpan = document.createElement('span');
      textSpan.className = 'typewriter-text';
      textSpan.style.cssText = `
        display: inline-block;
        font-family: ${template.fontFamily};
        font-size: ${template.fontSize};
        font-weight: ${template.fontWeight};
        color: ${template.textColor};
        text-shadow: ${template.textShadow || '2px 2px 6px rgba(0, 0, 0, 0.9)'};
        text-align: center;
        direction: rtl;
        transition: none;
        will-change: contents;
      `;
      textContainer.appendChild(textSpan);
    }
    
    // تحديث النص فقط إذا تغير
    if (textSpan.textContent !== visibleText) {
      textSpan.textContent = visibleText;
    }
    
    // إضافة المؤشر إذا كان مفعلاً ولم يكن موجوداً
    if (template.typewriterMode?.blinkCursor && !typewriterCursorElement) {
      const cursorSpan = document.createElement('span');
      cursorSpan.textContent = '|';
      cursorSpan.className = 'typewriter-cursor';
      cursorSpan.style.cssText = `
        display: inline-block;
        color: ${template.typewriterMode?.cursorColor || '#ffff00'};
        font-size: ${template.fontSize};
        font-weight: ${template.fontWeight};
        margin-right: 2px;
        animation: typewriterCursor ${template.typewriterMode?.cursorBlinkSpeed || '1s'} linear infinite;
        will-change: opacity;
      `;
      
      textContainer.appendChild(cursorSpan);
      typewriterCursorElement = cursorSpan;
    }
  } else {
    // إخفاء النص والمؤشر إذا كان charIndex سالب
    const textSpan = textContainer.querySelector('.typewriter-text');
    if (textSpan) {
      textSpan.textContent = '';
    }
    if (typewriterCursorElement) {
      typewriterCursorElement.remove();
      typewriterCursorElement = null;
    }
  }
}

// تصدير دوال قالب الآلة الكاتبة للنطاق العام
window.Typewriter = {
  applyArabicTypewriterTemplate,
  startArabicTypewriter,
  stopArabicTypewriter,
  syncArabicTypewriterWithVideo,
  updateArabicTypewriterDisplay,
  updateArabicTypewriterDisplayWithPhases,
  // متغيرات النظام
  getTypewriterInterval: () => typewriterInterval,
  getCurrentTypewriterCharIndex: () => currentTypewriterCharIndex,
  getTypewriterElements: () => typewriterElements,
  getIsTypewriterActive: () => isTypewriterActive,
  getTypewriterCursorElement: () => typewriterCursorElement
};

// تعيين المتغيرات في النطاق العام للوصول إليها من ملفات أخرى
window.typewriterInterval = typewriterInterval;
window.currentTypewriterCharIndex = currentTypewriterCharIndex;
window.typewriterElements = typewriterElements;
window.isTypewriterActive = isTypewriterActive;
window.typewriterCursorElement = typewriterCursorElement;
window.applyArabicTypewriterTemplate = applyArabicTypewriterTemplate;
window.stopArabicTypewriter = stopArabicTypewriter;
