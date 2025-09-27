// ملف إدارة قوالب الترجمة
// Template Management Module

// متغيرات القوالب
let selectedTemplate = null;
let templates = null;

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
    'capsule':'كبسولة أنيقة'
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
    captionBox.style.cssText = `
      font-family: ${tpl.fontFamily};
      font-size: ${tpl.fontSize};
      font-weight: ${tpl.fontWeight};
      color: ${tpl.textColor};
      text-align: ${tpl.align};
      width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      ${tpl.textShadow ? `text-shadow: ${tpl.textShadow};` : ''}
      ${tpl.background?.enabled ? `
        background: ${tpl.background.color};
        padding: ${tpl.background.paddingY} ${tpl.background.paddingX};
        border-radius: ${tpl.background.borderRadius};
      ` : 'background: rgba(0,0,0,0.85); padding: 12px 16px; border-radius: 8px;'}
      ${tpl.border ? `border: ${tpl.border};` : ''}
      ${tpl.boxShadow ? `box-shadow: ${tpl.boxShadow};` : ''}
      cursor: grab;
      user-select: none;
      touch-action: none;
      position: relative;
      pointer-events: auto;
    `;

    if(typeof write === 'function') write(`تم تطبيق القالب: ${tpl.name}`, 'success');
    else console.log(`تم تطبيق القالب: ${tpl.name}`);
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

// تصدير الدوال والمتغيرات للاستخدام في الملفات الأخرى
window.TemplateManager = {
  loadTemplates,
  renderTemplateOptions,
  applyTemplateStyles,
  switchToTemplatesTab,
  setupTemplateEventListeners,
  getSelectedTemplate: () => selectedTemplate,
  setSelectedTemplate: (template) => { selectedTemplate = template; },
  getTemplates: () => templates,
  initDOMElements
};

// تهيئة فورية عند تحميل الملف
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOMElements);
} else {
  initDOMElements();
}
