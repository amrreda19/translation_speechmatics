// ملف إدارة واجهة المستخدم للقوالب
// Template Management Module - UI Functions

// التبديل إلى تبويب القوالب
function switchToTemplatesTab(){
  // إظهار التبويبات بعد رفع الفيديو
  document.getElementById('sideTabs').style.display = 'flex';
  document.getElementById('welcomeMessage').style.display = 'none';
  
  const tabTemplates = document.getElementById('tabTemplates');
  const tabEditor = document.getElementById('tabEditor');
  const templateOptions = document.getElementById('templateOptions');
  const templatesSearchWrap = document.getElementById('templatesSearchWrap');
  const refreshTpl = document.getElementById('refreshTpl');
  const editorPanel = document.getElementById('editorPanel');
  const editorToolbar = document.getElementById('editorToolbar');
  const editorSearch = document.getElementById('editorSearch');
  
  if (tabTemplates) tabTemplates.classList.add('active');
  if (tabEditor) tabEditor.classList.remove('active');
  if (templateOptions) templateOptions.style.display = 'grid';
  if (templatesSearchWrap) templatesSearchWrap.style.display = 'flex';
  if (refreshTpl) refreshTpl.style.display = '';
  if (editorPanel) editorPanel.style.display = 'none';
  if (editorToolbar) editorToolbar.style.display = 'none';
  if (editorSearch) editorSearch.style.display = 'none';
}

// إعداد مستمعي الأحداث للقوالب
function setupTemplateEventListeners(){
  // تهيئة عناصر DOM
  const templateOptions = document.getElementById('templateOptions');
  const applyTemplateBtn = document.getElementById('applyTemplateBtn');
  const refreshTpl = document.getElementById('refreshTpl');
  const tabTemplates = document.getElementById('tabTemplates');
  const templatesSearchWrap = document.getElementById('templatesSearchWrap');
  
  // تحديث القوالب
  if(refreshTpl) {
    refreshTpl.addEventListener('click', ()=> {
      if (window.TemplateCore && window.TemplateCore.loadTemplates) {
        window.TemplateCore.loadTemplates();
      }
    });
  }
  
  // تطبيق القالب
  if(applyTemplateBtn) {
    applyTemplateBtn.addEventListener('click', ()=>{
      const currentTrack = window.currentTrack;
      const captionBox = window.captionBox || document.getElementById('captionBox');
      
      if(window.TemplateCore && window.TemplateCore.getSelectedTemplate) {
        const selectedTemplate = window.TemplateCore.getSelectedTemplate();
        
        if(selectedTemplate && currentTrack && captionBox){ 
          if (window.TemplateCore.applyTemplateStyles) {
            window.TemplateCore.applyTemplateStyles(selectedTemplate);
          }
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
      }
    });
  }

  // البحث في القوالب
  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{ 
      if (window.TemplateCore && window.TemplateCore.renderTemplateOptions) {
        window.TemplateCore.renderTemplateOptions(e.target.value.trim());
      }
    });
  }

  // التبديل إلى تبويب القوالب
  if(tabTemplates) {
    tabTemplates.addEventListener('click', switchToTemplatesTab);
  }
}

// تصدير دوال واجهة المستخدم للنطاق العام
window.TemplateUI = {
  switchToTemplatesTab,
  setupTemplateEventListeners
};
