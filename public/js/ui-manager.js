// إدارة واجهة المستخدم والرسائل
// UI Management

// دالة كتابة الرسائل
function write(msg, type = 'info') {
  const log = document.getElementById('log');
  const statusTxt = document.getElementById('statusTxt');
  
  if (!log || !statusTxt) return;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '⛔' : type === 'loading' ? '⏳' : 'ℹ️';
  log.textContent = `${icon} ${msg}`;
  statusTxt.innerHTML = `${icon} ${msg}`;
}

// دالة إظهار/إخفاء شريط التقدم
function showProgress(show) {
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  
  if (!progressBar || !progressFill) return;
  
  progressBar.style.display = show ? 'block' : 'none';
  if (show) progressFill.style.width = '0%';
}

// دالة تحديث التقدم
function updateProgress(p) {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill) return;
  progressFill.style.width = p + '%';
}

// دالة تنسيق حجم الملف
function formatSize(bytes) {
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + units[i];
}

// دالة تحويل الثواني إلى توقيت
function s2ts(s) { // seconds to timestamp mm:ss.mmm
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(3).padStart(6, '0');
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + sec;
}

// التبديل إلى تبويب التحرير
function switchToEditorTab() {
  const sideTabs = document.getElementById('sideTabs');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const tabEditor = document.getElementById('tabEditor');
  const editorPanel = document.getElementById('editorPanel');
  const editorToolbar = document.getElementById('editorToolbar');
  const editorSearch = document.getElementById('editorSearch');
  const tabTemplates = document.getElementById('tabTemplates');
  const templateOptions = document.getElementById('templateOptions');
  const templatesSearchWrap = document.getElementById('templatesSearchWrap');
  const refreshTpl = document.getElementById('refreshTpl');

  if (sideTabs) sideTabs.style.display = 'flex';
  if (welcomeMessage) welcomeMessage.style.display = 'none';

  if (tabEditor) tabEditor.classList.add('active');
  if (tabTemplates) tabTemplates.classList.remove('active');

  // إخفاء عناصر القوالب
  if (templateOptions) templateOptions.style.display = 'none';
  if (templatesSearchWrap) templatesSearchWrap.style.display = 'none';
  if (refreshTpl) refreshTpl.style.display = 'none';

  // إظهار عناصر التحرير
  if (editorPanel) editorPanel.style.display = 'flex';
  if (editorToolbar) editorToolbar.style.display = 'flex';
  if (editorSearch) editorSearch.style.display = 'block';
}

// إعداد مستمعي الأحداث لواجهة المستخدم
function setupUIEventListeners() {
  // ربط دالة التحرير
  const tabEditor = document.getElementById('tabEditor');
  if (tabEditor) {
    tabEditor.addEventListener('click', switchToEditorTab);
  }
}

// تصدير الدوال للاستخدام في الملفات الأخرى
window.UIManager = {
  write,
  showProgress,
  updateProgress,
  formatSize,
  s2ts,
  switchToEditorTab,
  setupUIEventListeners
};
