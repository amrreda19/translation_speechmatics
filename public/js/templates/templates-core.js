// ملف إدارة قوالب الترجمة - الأساسيات
// Template Management Module - Core Functions

// متغيرات القوالب الأساسية
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

// تطبيق أنماط القالب الأساسية
function applyTemplateStyles(tpl){
  if(!tpl) return;

  // الحصول على captionBox من النطاق العام
  const captionBox = window.captionBox || document.getElementById('captionBox');
  
  // تطبيق القالب على الكابشن المحسن فقط
  if(captionBox && tpl){
    // إيقاف أي هايلايت سابق إذا كان موجوداً
    if (window.isWordHighlightActive) {
      if (window.stopWordHighlight) window.stopWordHighlight();
      // إعادة النص إلى حالته الأصلية
      if (captionBox && window.currentCaptionText) {
        captionBox.textContent = window.currentCaptionText;
      }
    }
    
    // إيقاف أي تزامن ملصقات سابق إذا كان موجوداً
    if (window.isStickerSyncActive && window.stopStickerSync) {
      window.stopStickerSync();
    }
    
    // إيقاف أي تزامن هايلايت كابشن سابق إذا كان موجوداً
    if (window.isHighlightCaptionSyncActive && window.stopHighlightCaptionSync) {
      window.stopHighlightCaptionSync();
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

    // تطبيق القوالب المتخصصة
    if ((tpl.id === 'word-highlight' || tpl.id === 'yellow-sync-highlight' || tpl.id === 'wave-text-pink' || tpl.id === 'scale-text-green') && tpl.wordHighlight?.enabled) {
      // تطبيق قالب الهايلايت
      if (window.startWordHighlight) {
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
              window.startWordHighlight(captionBox, tpl, vttData);
            } else {
              const firstCue = vttCues[0];
              if (firstCue) {
                const vttData = {
                  start: firstCue.start,
                  end: firstCue.end,
                  text: firstCue.text
                };
                window.startWordHighlight(captionBox, tpl, vttData);
              }
            }
          }
        } else {
          const currentText = captionBox.textContent || captionBox.innerText;
          if (currentText && currentText.trim()) {
            const vttData = {
              start: 0,
              end: 5,
              text: currentText
            };
            window.startWordHighlight(captionBox, tpl, vttData);
          }
        }
      }
    } else if (tpl.id === 'sticker-captions' && tpl.stickerMode?.enabled) {
      // تطبيق قالب الملصقات الملونة
      if (window.applyStickerTemplate) {
        window.applyStickerTemplate(captionBox, tpl);
      }
    } else if (tpl.id === 'highlight-caption' && tpl.highlightMode?.enabled) {
      // تطبيق قالب هايلايت كابشن الجديد
      if (window.applyHighlightCaptionTemplate) {
        window.applyHighlightCaptionTemplate(captionBox, tpl);
      }
    } else if (tpl.id === 'single-word-sync' && tpl.singleWordMode?.enabled) {
      // تطبيق قالب الكلمة الواحدة المتزامنة
      if (window.applySingleWordSyncTemplate) {
        window.applySingleWordSyncTemplate(captionBox, tpl);
      }
    } else if (tpl.id === 'arabic-typewriter' && tpl.typewriterMode?.enabled) {
      // تطبيق قالب الكتابة على الآلة الكاتبة العربية
      if (window.applyArabicTypewriterTemplate) {
        window.applyArabicTypewriterTemplate(captionBox, tpl);
      }
    } else {
      // تطبيق نظام المرحلتين على باقي القوالب
      if (window.applyTwoPhaseTemplate) {
        window.applyTwoPhaseTemplate(captionBox, tpl);
      }
      
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
  }
}

// تهيئة فورية عند تحميل الملف
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOMElements);
} else {
  initDOMElements();
}

// تصدير الدوال الأساسية للنطاق العام
window.TemplateCore = {
  getSelectedTemplate,
  initDOMElements,
  loadTemplates,
  renderTemplateOptions,
  applyTemplateStyles,
  templateDescription,
  injectAnimationByName,
  getTemplates: () => templates,
  setSelectedTemplate: (template) => { selectedTemplate = template; }
};
