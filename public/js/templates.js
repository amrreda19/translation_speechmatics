// ملف إدارة قوالب الترجمة
// Template Management Module

// متغيرات القوالب
let selectedTemplate = null;
let templates = null;

// دالة الحصول على القالب المختار
function getSelectedTemplate() {
  return selectedTemplate;
}

// عناصر DOM المتعلقة بالقوالب (سيتم تهيئتها عند الحاجة)
let templateOptions, applyTemplateBtn, refreshTpl, tabTemplates, templatesSearchWrap;

// تهيئة عناصر DOM
function initDOMElements() {
  templateOptions = document.getElementById('templateOptions');
  applyTemplateBtn = document.getElementById('applyTemplateBtn');
  refreshTpl = document.getElementById('refreshTpl');
  tabTemplates = document.getElementById('tabTemplates');
  templatesSearchWrap = document.getElementById('templatesSearchWrap');
}

// تحميل القوالب
async function loadTemplates(){
  try{
    initDOMElements(); // تهيئة عناصر DOM
    const resp = await fetch('config/captionTemplates.json', {cache:'no-store'});
    templates = await resp.json();
    renderTemplateOptions();
    if(typeof write === 'function') write('تم تحميل القوالب بنجاح.', 'success');
    else console.log('تم تحميل القوالب بنجاح.');
  }catch(e){
    console.error(e);
    console.error('خطأ في تحميل قوالب الترجمة.');
  }
}

// حقن @keyframes لأنميشن واحد بالاسم (يُستخدم مع قالب highlight-caption فقط)
function injectAnimationByName(name) {
  try {
    if (!templates || !templates.animations || !templates.animations[name]) return;
    const def = templates.animations[name];
    if (!def || !def.keyframes) return;

    const styleId = `caption-anim-${name}`;
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = def.keyframes;
  } catch (e) {
    console.error('Failed to inject animation keyframes', e);
  }
}

// وصف القوالب
function templateDescription(id){
  const map = {
    'classic-white':'كلاسيكي أبيض بسيط',
    'tiktok-style':'ملوّن بأسلوب تيك توك',
    'karaoke':'كاريوكي مع تمييز الكلمات',
    'capsule':'كبسولة أنيقة',
    'word-highlight':'هايلايت كلمة بكلمة متزامن',
    'yellow-sync-highlight':'تمييز أصفر متزامن بدون خلفية',
    'sticker-captions':'ملصقات ملونة في شبكة 2×2',
    'highlight-caption':'هايلايت كابشن بارز بأسلوب VEED',
    'single-word-sync':'كلمة واحدة متزامنة مع الصوت بدون خلفية',
    'wave-text-pink':'موجة نص وردي مع تأثير حركة الموجة',
    'scale-text-green':'تكبير نص أخضر مع تأثير التكبير والتصغير',
    'arabic-typewriter':'كتابة عربية على الآلة الكاتبة من اليمين إلى اليسار'
  };
  return map[id] || '';
}

// عرض خيارات القوالب
function renderTemplateOptions(filter=''){
  if(!templateOptions) return;
  templateOptions.innerHTML = '';
  if(!templates || !templates.templates){ return; }
  const list = templates.templates.filter(t => t.name.includes(filter) || t.id.includes(filter));
  list.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = t.id;

    const prev = document.createElement('div');
    prev.className = 'preview';
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = 'عينة نص';
    pill.style.cssText = `
      font-family:${t.fontFamily};
      font-size:${t.fontSize};
      font-weight:${t.fontWeight};
      color:${t.textColor};
      ${t.background?.enabled ? `background:${t.background.color}; padding:${t.background.paddingY} ${t.background.paddingX}; border-radius:${t.background.borderRadius};` : ''}
      ${t.textShadow ? `text-shadow:${t.textShadow};` : ''}
      ${t.border ? `border:${t.border};` : ''}
      ${t.boxShadow ? `box-shadow:${t.boxShadow};` : ''}
    `;
    prev.appendChild(pill);

    const title = document.createElement('div');
    title.style.fontWeight='700';
    title.textContent = t.name;

    const desc = document.createElement('div');
    desc.style.color='#94a3b8';
    desc.style.fontSize='.9rem';
    desc.textContent = templateDescription(t.id);

    card.appendChild(prev);
    card.appendChild(title);
    card.appendChild(desc);

    card.addEventListener('click', ()=>{
      [...document.querySelectorAll('.card')].forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTemplate = t;
      if(applyTemplateBtn) applyTemplateBtn.disabled = false;
      if(typeof write === 'function') write(`تم اختيار قالب: ${t.name}`, 'success');
      else console.log(`تم اختيار قالب: ${t.name}`);
      // تطبيق فوري إن كانت هناك ترجمة
      const currentTrack = window.currentTrack;
      if(currentTrack){ applyTemplateStyles(selectedTemplate); }
    });

    templateOptions.appendChild(card);
  });

  if(!list.length){
    const empty = document.createElement('div');
    empty.style.cssText='opacity:.7;padding:10px;text-align:center';
    empty.textContent = 'لا توجد نتائج مطابقة.';
    templateOptions.appendChild(empty);
  }
}

// تطبيق أنماط القالب
function applyTemplateStyles(tpl){
  if(!tpl) return;

  // الحصول على captionBox من النطاق العام
  const captionBox = window.captionBox || document.getElementById('captionBox');
  
  // تطبيق القالب على الكابشن المحسن فقط
  if(captionBox && tpl){
    // إيقاف أي هايلايت سابق إذا كان موجوداً
    if (isWordHighlightActive) {
      stopWordHighlight();
      // إعادة النص إلى حالته الأصلية
      if (captionBox && currentCaptionText) {
        captionBox.textContent = currentCaptionText;
      }
    }
    
    // إيقاف أي تزامن ملصقات سابق إذا كان موجوداً
    if (isStickerSyncActive) {
      stopStickerSync();
    }
    
    // إيقاف أي تزامن هايلايت كابشن سابق إذا كان موجوداً
    if (isHighlightCaptionSyncActive) {
      stopHighlightCaptionSync();
    }
    
    // تطبيق الأنماط الأساسية
    const baseStyles = `
      font-family: ${tpl.fontFamily};
      font-size: ${tpl.fontSize};
      font-weight: ${tpl.fontWeight};
      color: ${tpl.textColor};
      text-align: ${tpl.align};
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      ${tpl.textShadow ? `text-shadow: ${tpl.textShadow};` : ''}
      ${tpl.background?.enabled ? `
        background: ${tpl.background.color};
        padding: ${tpl.background.paddingY} ${tpl.background.paddingX};
        border-radius: ${tpl.background.borderRadius};
      ` : tpl.background?.enabled === false ? 'background: transparent !important; padding: 0 !important; border: none !important; box-shadow: none !important;' : 'background: rgba(0,0,0,0.85); padding: 12px 16px; border-radius: 8px;'}
      ${tpl.border ? `border: ${tpl.border};` : ''}
      ${tpl.boxShadow ? `box-shadow: ${tpl.boxShadow};` : ''}
      cursor: grab;
      user-select: none;
      touch-action: none;
      position: relative;
      pointer-events: auto;
    `;
    
    // تطبيق الأنماط حسب نوع القالب
    if (tpl.id === 'word-highlight' || tpl.id === 'yellow-sync-highlight' || tpl.id === 'wave-text-pink' || tpl.id === 'scale-text-green') {
      captionBox.style.cssText = baseStyles + `
        width: auto !important;
        max-width: 95% !important;
        min-width: 200px !important;
        display: inline-block !important;
      `;
      
    } else if (tpl.id === 'sticker-captions') {
      // تطبيق أنماط قالب الملصقات
      captionBox.style.cssText = baseStyles + `
        width: auto !important;
        max-width: 90% !important;
        min-width: 300px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        background: transparent !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      `;
      
    } else {
      captionBox.style.cssText = baseStyles + `width: 100%;`;
    }

    // إذا كان قالب الهايلايت كلمة بكلمة، تطبيقه
    if ((tpl.id === 'word-highlight' || tpl.id === 'yellow-sync-highlight' || tpl.id === 'wave-text-pink' || tpl.id === 'scale-text-green') && tpl.wordHighlight?.enabled) {
      // إضافة كلاس خاص للكابشن
      captionBox.classList.add('word-highlight-mode');
      if (tpl.id === 'yellow-sync-highlight') {
        captionBox.classList.add('yellow-sync-highlight');
      } else if (tpl.id === 'wave-text-pink') {
        captionBox.classList.add('wave-text-pink');
      } else if (tpl.id === 'scale-text-green') {
        captionBox.classList.add('scale-text-green');
      }
      
      // الحصول على بيانات VTT الحالية
      const vttCues = window.vttCues || [];
      if (vttCues && vttCues.length > 0) {
        // البحث عن الكابشن الحالي
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
            startWordHighlight(captionBox, tpl, vttData);
          } else {
            // إذا لم نجد كابشن حالي، نبدأ بالكابشن الأول
            const firstCue = vttCues[0];
            if (firstCue) {
              const vttData = {
                start: firstCue.start,
                end: firstCue.end,
                text: firstCue.text
              };
              startWordHighlight(captionBox, tpl, vttData);
            }
          }
        }
      } else {
        // إذا لم تكن هناك بيانات VTT، نطبق الهايلايت على النص الحالي
        const currentText = captionBox.textContent || captionBox.innerText;
        if (currentText && currentText.trim()) {
          const vttData = {
            start: 0,
            end: 5, // مدة افتراضية 5 ثوان
            text: currentText
          };
          startWordHighlight(captionBox, tpl, vttData);
        }
      }
    } else if (tpl.id === 'sticker-captions' && tpl.stickerMode?.enabled) {
      // تطبيق قالب الملصقات الملونة
      applyStickerTemplate(captionBox, tpl);
      
      // رسالة تشخيصية للملصقات
      console.log('تم تطبيق قالب الملصقات الملونة:', {
        showOnSpeak: tpl.stickerMode?.showOnSpeak,
        speakDelay: tpl.stickerMode?.speakDelay,
        syncWithAudio: tpl.stickerMode?.syncWithAudio,
        maxWords: tpl.stickerMode?.maxWords
      });
    } else if (tpl.id === 'highlight-caption' && tpl.highlightMode?.enabled) {
      // تطبيق قالب هايلايت كابشن الجديد
      applyHighlightCaptionTemplate(captionBox, tpl);
      
      // رسالة تشخيصية للقالب الجديد
      console.log('تم تطبيق قالب هايلايت كابشن:', {
        highlightMode: tpl.highlightMode?.type,
        syncWithAudio: tpl.highlightMode?.syncWithAudio,
        maxWords: tpl.highlightMode?.maxWords
      });
    } else if (tpl.id === 'single-word-sync' && tpl.singleWordMode?.enabled) {
      // تطبيق قالب الكلمة الواحدة المتزامنة
      applySingleWordSyncTemplate(captionBox, tpl);
      
      // رسالة تشخيصية للقالب الجديد
      console.log('تم تطبيق قالب الكلمة الواحدة المتزامنة:', {
        singleWordMode: tpl.singleWordMode?.enabled,
        syncWithAudio: tpl.singleWordMode?.syncWithAudio,
        fontSize: tpl.fontSize
      });
    } else if (tpl.id === 'arabic-typewriter' && tpl.typewriterMode?.enabled) {
      // تطبيق قالب الكتابة على الآلة الكاتبة العربية
      applyArabicTypewriterTemplate(captionBox, tpl);
      
      // رسالة تشخيصية للقالب الجديد
      console.log('تم تطبيق قالب الكتابة على الآلة الكاتبة العربية:', {
        typewriterMode: tpl.typewriterMode?.enabled,
        syncWithAudio: tpl.typewriterMode?.syncWithAudio,
        charDelay: tpl.typewriterMode?.charDelay,
        direction: tpl.direction
      });
    } else {
      // تطبيق نظام المرحلتين على باقي القوالب
      applyTwoPhaseTemplate(captionBox, tpl);
      
      // إزالة كلاس الهايلايت إذا لم يكن قالب الهايلايت
      captionBox.classList.remove('word-highlight-mode');
    }

    // التأكد من وجود المقابض بعد تطبيق أي قالب
    setTimeout(() => {
      if (window.CaptionSystem && window.CaptionSystem.ensureResizeHandles) {
        window.CaptionSystem.ensureResizeHandles();
        
        // إظهار المقابض مؤقتاً عند تطبيق القالب
        const resizeHandles = captionBox.querySelector('.resize-handles');
        if (resizeHandles) {
          resizeHandles.style.opacity = '1';
          resizeHandles.style.pointerEvents = 'auto';
          
          // إخفاء المقابض بعد 3 ثوان
          setTimeout(() => {
            if (resizeHandles) {
              resizeHandles.style.opacity = '';
              resizeHandles.style.pointerEvents = '';
            }
          }, 3000);
        }
      }
    }, 100);

    if(typeof write === 'function') write(`تم تطبيق القالب: ${tpl.name}`, 'success');
    else console.log(`تم تطبيق القالب: ${tpl.name}`);
    
    // رسالة تشخيصية للهايلايت
    if (tpl.id === 'word-highlight') {
      console.log('تم تطبيق قالب الهايلايت:', {
        hasVttCues: !!(window.vttCues && window.vttCues.length > 0),
        vttCuesCount: window.vttCues ? window.vttCues.length : 0,
        captionText: captionBox.textContent,
        wordHighlightEnabled: tpl.wordHighlight?.enabled
      });
    }
  }
}

// التبديل إلى تبويب القوالب
function switchToTemplatesTab(){
  // إظهار التبويبات بعد رفع الفيديو
  document.getElementById('sideTabs').style.display = 'flex';
  document.getElementById('welcomeMessage').style.display = 'none';
  
  tabTemplates.classList.add('active');
  tabEditor.classList.remove('active');
  templateOptions.style.display = 'grid';
  templatesSearchWrap.style.display = 'flex';
  refreshTpl.style.display = '';
  editorPanel.style.display = 'none';
  editorToolbar.style.display = 'none';
  editorSearch.style.display = 'none';
}

// إعداد مستمعي الأحداث للقوالب
function setupTemplateEventListeners(){
  initDOMElements(); // تهيئة عناصر DOM
  
  // تحديث القوالب
  if(refreshTpl) refreshTpl.addEventListener('click', ()=> loadTemplates());
  
  // تطبيق القالب
  if(applyTemplateBtn) {
    applyTemplateBtn.addEventListener('click', ()=>{
      const currentTrack = window.currentTrack;
      const captionBox = window.captionBox || document.getElementById('captionBox');
      
      if(selectedTemplate && currentTrack && captionBox){ 
        applyTemplateStyles(selectedTemplate); 
        if(typeof write === 'function') write(`طُبّق القالب: ${selectedTemplate.name}`, 'success');
        else console.log(`طُبّق القالب: ${selectedTemplate.name}`); 
      }
      else if(!selectedTemplate){ 
        if(typeof write === 'function') write('من فضلك اختر قالباً أولاً.', 'error');
        else console.log('من فضلك اختر قالباً أولاً.'); 
      }
      else if(!currentTrack){ 
        if(typeof write === 'function') write('لا يوجد تراك ترجمة مطبق.', 'error');
        else console.log('لا يوجد تراك ترجمة مطبق.'); 
      }
      else{ 
        if(typeof write === 'function') write('نظام الكابشن غير جاهز بعد.', 'error');
        else console.log('نظام الكابشن غير جاهز بعد.'); 
      }
    });
  }

  // البحث في القوالب
  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{ 
      renderTemplateOptions(e.target.value.trim()); 
    });
  }

  // التبديل إلى تبويب القوالب
  if(tabTemplates) tabTemplates.addEventListener('click', switchToTemplatesTab);
}

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

// تطبيق قالب الهايلايت كلمة بكلمة
function applyWordHighlightTemplate(captionBox, template, vttData) {
  if (!template || template.id !== 'word-highlight') {
    return false; // ليس قالب الهايلايت
  }
  
  // تطبيق الأنماط الأساسية أولاً
  applyTemplateStyles(template);
  
  // بدء نظام الهايلايت
  startWordHighlight(captionBox, template, vttData);
  
  return true;
}

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

  // حقن الأنميشن لهذا القالب فقط (سيُطبَّق على الكلمات لاحقاً)
  if (template.animation && templates?.animations?.[template.animation]?.keyframes) {
    injectAnimationByName(template.animation);
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

// تهيئة فورية عند تحميل الملف
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOMElements);
} else {
  initDOMElements();
}

// متغيرات قالب الملصقات
let stickerColorIndex = 0;
let stickerSyncInterval = null;
let currentStickerWordIndex = 0;
let stickerWordElements = [];
let isStickerSyncActive = false;

// متغيرات قالب هايلايت كابشن الجديد
let highlightCaptionSyncInterval = null;
let currentHighlightCaptionWordIndex = 0;
let highlightCaptionWordElements = [];
let isHighlightCaptionSyncActive = false;

// متغيرات قالب الكلمة الواحدة المتزامنة
let singleWordSyncInterval = null;
let currentSingleWordIndex = 0;
let singleWordElements = [];
let isSingleWordSyncActive = false;

// متغيرات قالب الكتابة على الآلة الكاتبة العربية
let typewriterInterval = null;
let currentTypewriterCharIndex = 0;
let typewriterElements = [];
let isTypewriterActive = false;
let typewriterCursorElement = null;

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
          const animDef = templates && templates.animations ? templates.animations[animName] : null;
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

// متغيرات نظام المرحلتين للقوالب العادية
let twoPhaseSyncInterval = null;
let currentTwoPhaseWordIndex = 0;
let twoPhaseWordElements = [];
let isTwoPhaseSyncActive = false;

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
  if (template.animation && templates?.animations?.[template.animation]?.keyframes) {
    injectAnimationByName(template.animation);
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
  if (template.animation && templates?.animations?.[template.animation]?.keyframes) {
    injectAnimationByName(template.animation);
  }
  
  // حقن أنيميشن المؤشر
  if (template.typewriterMode?.blinkCursor && templates?.animations?.typewriterCursor?.keyframes) {
    injectAnimationByName('typewriterCursor');
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

// إضافة إلى النطاق العام
window.TemplateManager = {
  loadTemplates,
  renderTemplateOptions,
  applyTemplateStyles,
  switchToTemplatesTab,
  setupTemplateEventListeners,
  getSelectedTemplate: () => selectedTemplate,
  setSelectedTemplate: (template) => { selectedTemplate = template; },
  getTemplates: () => templates,
  initDOMElements,
  // دوال الهايلايت الجديدة
  startWordHighlight,
  stopWordHighlight,
  applyWordHighlightTemplate,
  highlightWord,
  splitTextIntoWords,
  syncWordHighlightWithVideo,
  syncWordHighlightWithVideoPhases,
  updateWordHighlightDisplayWithPhases,
  // دوال قالب الملصقات
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
  // دوال نظام المرحلتين للقوالب العادية
  applyTwoPhaseTemplate,
  startTwoPhaseSync,
  stopTwoPhaseSync,
  syncTwoPhaseWithVideo,
  updateTwoPhaseDisplay,
  // دوال قالب هايلايت كابشن الجديد
  applyHighlightCaptionTemplate,
  startHighlightCaptionSync,
  stopHighlightCaptionSync,
  syncHighlightCaptionWithVideo,
  updateHighlightCaptionDisplayWithPhases,
  // دوال قالب الكلمة الواحدة المتزامنة
  applySingleWordSyncTemplate,
  startSingleWordSync,
  stopSingleWordSync,
  syncSingleWordWithVideo,
  updateSingleWordDisplay,
  // دوال قالب الكتابة على الآلة الكاتبة العربية
  applyArabicTypewriterTemplate,
  startArabicTypewriter,
  stopArabicTypewriter,
  syncArabicTypewriterWithVideo,
  updateArabicTypewriterDisplay,
  updateArabicTypewriterDisplayWithPhases
};
