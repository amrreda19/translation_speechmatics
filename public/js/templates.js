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

// وصف القوالب
function templateDescription(id){
  const map = {
    'classic-white':'كلاسيكي أبيض بسيط',
    'tiktok-style':'ملوّن بأسلوب تيك توك',
    'karaoke':'كاريوكي مع تمييز الكلمات',
    'capsule':'كبسولة أنيقة',
    'word-highlight':'هايلايت كلمة بكلمة متزامن',
    'yellow-sync-highlight':'تمييز أصفر متزامن بدون خلفية'
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
    if (tpl.id === 'word-highlight' || tpl.id === 'yellow-sync-highlight') {
      captionBox.style.cssText = baseStyles + `
        width: auto !important;
        max-width: 95% !important;
        min-width: 200px !important;
        display: inline-block !important;
      `;
      
    } else {
      captionBox.style.cssText = baseStyles + `width: 100%;`;
    }

    // إذا كان قالب الهايلايت كلمة بكلمة، تطبيقه
    if ((tpl.id === 'word-highlight' || tpl.id === 'yellow-sync-highlight') && tpl.wordHighlight?.enabled) {
      // إضافة كلاس خاص للكابشن
      captionBox.classList.add('word-highlight-mode');
      if (tpl.id === 'yellow-sync-highlight') {
        captionBox.classList.add('yellow-sync-highlight');
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
    } else {
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
  
  // إنشاء عناصر الكلمات
  wordElements = createWordElements(text, template);
  
  // مسح محتوى الكابشن وإضافة الكلمات
  captionBox.innerHTML = '';
  wordElements.forEach(wordEl => {
    captionBox.appendChild(wordEl);
  });
  
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
  
  // تطبيق الهايلايت على الكلمة الأولى فوراً
  highlightWord(0, template);
  
  // بدء التزامن مع الفيديو
  syncWordHighlightWithVideo(template, vttData);
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
    captionBox.classList.remove('word-highlight-mode', 'yellow-sync-highlight');
    
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

// تهيئة فورية عند تحميل الملف
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOMElements);
} else {
  initDOMElements();
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
  syncWordHighlightWithVideo
};
