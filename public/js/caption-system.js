// نظام إدارة الكابشن المحسن
// Caption System Management

// متغيرات نظام الكابشن
let captionPosition = { x: 50, y: 88 }; // موضع افتراضي (وسط أسفل)
let captionContainer = null;
let captionBox = null;
let currentCaptionText = '';
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// إنشاء نظام الكابشن المحسن
function createCaptionSystem() {
  if (!window.currentTrack) return;

  // إزالة النظام القديم إذا كان موجوداً
  if (captionContainer) {
    captionContainer.remove();
  }

  // إنشاء حاوية الكابشن
  captionContainer = document.createElement('div');
  captionContainer.className = 'caption-container';
  // تطبيق الموضع المحفوظ
  captionContainer.style.left = captionPosition.x + '%';
  captionContainer.style.top = captionPosition.y + '%';

  // إنشاء صندوق الكابشن
  captionBox = document.createElement('div');
  captionBox.className = 'caption-box';
  captionBox.setAttribute('dir', 'auto');
  
  // تحديث النطاق العام
  window.captionBox = captionBox;
  captionBox.textContent = 'جاهز للعرض...';

  // إنشاء مقابض تغيير الحجم
  const resizeHandles = document.createElement('div');
  resizeHandles.className = 'resize-handles';
  resizeHandles.setAttribute('aria-hidden', 'true');

  const handleDirections = ['nw', 'ne', 'e', 'se', 'sw', 'w'];
  handleDirections.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `handle ${dir}`;
    handle.setAttribute('data-dir', dir);
    handle.title = `تغيير الحجم - ${dir}`;
    resizeHandles.appendChild(handle);
  });

  // إنشاء زر إعادة تعيين الموضع
  const resetBtn = document.createElement('button');
  resetBtn.className = 'reset-position-btn';
  resetBtn.innerHTML = '⟳';
  resetBtn.title = 'إعادة التعيين';
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCaptionPosition();
  });

  // إضافة العناصر
  captionBox.appendChild(resizeHandles);
  captionContainer.appendChild(captionBox);
  captionContainer.appendChild(resetBtn);

  // إضافة تفاعلات السحب/الحجم
  setupCaptionInteractions();

  // إضافة الكابشن إلى المرحلة
  const videoWrap = document.getElementById('videoWrap') || document.getElementById('stage');
  videoWrap.appendChild(captionContainer);

  // تحليل ملف VTT
  if (window.VTTManager) {
    window.VTTManager.parseVTTFile();
  }

  if (typeof write === 'function') write('تم إنشاء نظام الكابشن المحسن بنجاح', 'success');
}

// دالة التأكد من وجود مقابض التغيير
function ensureResizeHandles() {
  if (!captionBox) return;
  
  const resizeHandles = captionBox.querySelector('.resize-handles');
  if (!resizeHandles) {
    const handles = document.createElement('div');
    handles.className = 'resize-handles';
    handles.setAttribute('aria-hidden', 'true');

    const handleDirections = ['nw', 'ne', 'e', 'se', 'sw', 'w'];
    handleDirections.forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `handle ${dir}`;
      handle.setAttribute('data-dir', dir);
      handle.title = `تغيير الحجم - ${dir}`;
      handles.appendChild(handle);
    });
    
    captionBox.appendChild(handles);
    setupCaptionInteractions();
  }
}

// إعداد تفاعلات الكابشن (السحب/الحجم)
function setupCaptionInteractions() {
  if (!captionBox || !captionContainer) return;

  // متغيرات الحالة
  let dragging = false;
  let resizing = false;
  let dir = null;
  let startX = 0, startY = 0;
  let stageRect = null;
  let vel = { vx: 0, vy: 0 };
  let lastMoveTime = 0;
  let inertialRAF = null;
  let springRAF = null;

  // متغيرات الحجم والخط
  let widthPc = 60;
  let fontPx = 20;
  const MIN_W = 20, MAX_W = 95;
  const MIN_FONT = 12, MAX_FONT = 60;

  // ثوابت الفيزياء
  const FRICTION = 0.92, BOUNCE = 0.5;
  const SPRING_K = 0.18, SPRING_D = 0.75;
  let velSpring = { w: 0, f: 0 };
  let target = { width: null, font: null };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // تطبيق الحالة المحفوظة
  loadCaptionState();
  applyCaptionState();

  // دالة حفظ الحالة
  function saveCaptionState() {
    try {
      const state = {
        pos: captionPosition,
        widthPc: widthPc,
        fontPx: fontPx
      };
      localStorage.setItem('captionState', JSON.stringify(state));
    } catch (e) {}
  }

  // دالة تحميل الحالة
  function loadCaptionState() {
    try {
      const saved = localStorage.getItem('captionState');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.pos) captionPosition = state.pos;
        if (state.widthPc) widthPc = state.widthPc;
        if (state.fontPx) fontPx = state.fontPx;
      }
    } catch (e) {}
  }

  // دالة تطبيق الحالة
  function applyCaptionState() {
    captionContainer.style.left = captionPosition.x + '%';
    captionContainer.style.top = captionPosition.y + '%';
    captionContainer.style.width = widthPc + '%';
    captionBox.style.width = '100%';
    captionBox.style.fontSize = fontPx + 'px';
    
    // تحديث المتغيرات المستهدفة
    target.width = widthPc;
    target.font = fontPx;
  }

  // دالة القصور الذاتي
  function inertiaStep() {
    captionPosition.x += vel.vx;
    captionPosition.y += vel.vy;

    let bounced = false;
    if (captionPosition.x < 3) { captionPosition.x = 3; vel.vx = -vel.vx * BOUNCE; bounced = true; }
    if (captionPosition.x > 97) { captionPosition.x = 97; vel.vx = -vel.vx * BOUNCE; bounced = true; }
    if (captionPosition.y < 3) { captionPosition.y = 3; vel.vy = -vel.vy * BOUNCE; bounced = true; }
    if (captionPosition.y > 97) { captionPosition.y = 97; vel.vy = -vel.vy * BOUNCE; bounced = true; }

    vel.vx *= FRICTION;
    vel.vy *= FRICTION;

    captionContainer.style.left = captionPosition.x + '%';
    captionContainer.style.top = captionPosition.y + '%';

    if (Math.hypot(vel.vx, vel.vy) < 0.02 && !bounced) {
      inertialRAF = null;
      saveCaptionState();
      return;
    }
    inertialRAF = requestAnimationFrame(inertiaStep);
  }

  // دالة النابض للتغيير
  function springStep() {
    const dt = 1;
    let needsUpdate = false;
    
    if (target.width != null) {
      const x = widthPc, g = target.width;
      const a = SPRING_K * (g - x) - SPRING_D * velSpring.w;
      velSpring.w += a * dt;
      widthPc += velSpring.w * dt;
      widthPc = clamp(widthPc, MIN_W, MAX_W);
      captionContainer.style.width = widthPc + '%';
      needsUpdate = true;
    }
    
    if (target.font != null) {
      const x = fontPx, g = target.font;
      const a = SPRING_K * (g - x) - SPRING_D * velSpring.f;
      velSpring.f += a * dt;
      fontPx += velSpring.f * dt;
      fontPx = clamp(fontPx, MIN_FONT, MAX_FONT);
      captionBox.style.fontSize = fontPx + 'px';
      needsUpdate = true;
    }
    
    const nearW = target.width == null || Math.abs(target.width - widthPc) < 0.05;
    const nearF = target.font == null || Math.abs(target.font - fontPx) < 0.05;
    
    if (nearW && nearF) {
      springRAF = null;
      saveCaptionState();
      return;
    }
    
    if (needsUpdate) {
      springRAF = requestAnimationFrame(springStep);
    }
  }

  // أحداث السحب
  captionBox.addEventListener('pointerdown', (e) => {
    // تجاهل النقر على المقابض أو زر الإعادة
    if (e.target.classList.contains('handle') || e.target.classList.contains('caption-reset-btn')) return;
    dragging = true;
    captionBox.setPointerCapture(e.pointerId);
    stageRect = document.getElementById('player').getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    lastMoveTime = performance.now();
    if (inertialRAF) { cancelAnimationFrame(inertialRAF); inertialRAF = null; }
    vel.vx = 0; vel.vy = 0;
    captionBox.classList.add('caption-focus');
    
    // إظهار المقابض عند النقر
    const resizeHandles = captionBox.querySelector('.resize-handles');
    if (resizeHandles) {
      resizeHandles.style.opacity = '1';
      resizeHandles.style.pointerEvents = 'auto';
    }
    
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  captionBox.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const px = (dx / stageRect.width) * 100;
    const py = (dy / stageRect.height) * 100;

    captionPosition.x = clamp(captionPosition.x + px, 3, 97);
    captionPosition.y = clamp(captionPosition.y + py, 3, 97);
    captionContainer.style.left = captionPosition.x + '%';
    captionContainer.style.top = captionPosition.y + '%';

    vel.vx = (px) / dt * 16.67;
    vel.vy = (py) / dt * 16.67;

    startX = e.clientX;
    startY = e.clientY;
    lastMoveTime = now;
  });

  captionBox.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    captionBox.classList.remove('caption-focus');
    
    // إخفاء المقابض بعد ثانيتين من الانتهاء من السحب
    const resizeHandles = captionBox.querySelector('.resize-handles');
    if (resizeHandles) {
      setTimeout(() => {
        if (resizeHandles && !captionBox.classList.contains('caption-focus')) {
          resizeHandles.style.opacity = '';
          resizeHandles.style.pointerEvents = '';
        }
      }, 2000);
    }
    
    inertialRAF = requestAnimationFrame(inertiaStep);
  });

  captionBox.addEventListener('pointercancel', () => {
    dragging = false;
    document.body.style.userSelect = '';
    captionBox.classList.remove('caption-focus');
  });

  // أحداث تغيير الحجم
  Array.from(captionBox.querySelectorAll('.handle')).forEach(handle => {
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // منع انتشار الحدث إلى captionBox
      dir = handle.dataset.dir;
      resizing = true;
      handle.setPointerCapture(e.pointerId);
      stageRect = document.getElementById('player').getBoundingClientRect();
      const startRX = e.clientX;
      const startRY = e.clientY;
      const w0 = widthPc;
      const f0 = fontPx;
      if (springRAF) { cancelAnimationFrame(springRAF); springRAF = null; }
      velSpring.w = 0; velSpring.f = 0;
      captionBox.classList.add('caption-focus');
      document.body.style.userSelect = 'none';
      e.preventDefault();

      function onMove(ev) {
        if (!resizing) return;
        const dx = ev.clientX - startRX;
        const dy = ev.clientY - startRY;
        let nextW = widthPc, nextF = fontPx;
        
        // تغيير العرض (الجانبين)
        if (dir.includes('e') || dir.includes('w')) {
          const dPct = (dx / stageRect.width) * 100 * (dir.includes('e') ? 1 : -1);
          nextW = Math.max(20, Math.min(95, w0 + dPct));
        }
        
        // تغيير حجم الخط فقط (الأعلى والأسفل) - بدون تغيير العرض
        if (dir.includes('n') || dir.includes('s')) {
          const sign = dir.includes('s') ? 1 : -1;
          const dScale = 1 + (sign * dy) / 320;
          const newFont = Math.max(12, Math.min(60, f0 * dScale));
          nextF = newFont;
          // لا نغير العرض - نتركه كما هو
          nextW = widthPc;
        }
        
        // تطبيق التغييرات فوراً
        widthPc = nextW;
        fontPx = nextF;
        captionContainer.style.width = widthPc + '%';
        captionBox.style.fontSize = fontPx + 'px';
      }

      function onUp() {
        resizing = false;
        dir = null;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
        captionBox.classList.remove('caption-focus');
        saveCaptionState();
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  });

  // دالة إعادة التعيين
  function resetCaptionPosition() {
    captionPosition = { x: 50, y: 90 };
    widthPc = 60;
    fontPx = 20;
    target.width = widthPc;
    target.font = fontPx;
    
    // تطبيق التغييرات فوراً
    captionContainer.style.left = captionPosition.x + '%';
    captionContainer.style.top = captionPosition.y + '%';
    captionContainer.style.width = widthPc + '%';
    captionBox.style.width = '100%';
    captionBox.style.fontSize = fontPx + 'px';
    
    if (inertialRAF) { cancelAnimationFrame(inertialRAF); inertialRAF = null; }
    saveCaptionState();
    if (typeof write === 'function') write('تم إعادة تعيين موضع وحجم الكابشن', 'success');
  }

  // ربط زر إعادة التعيين
  const resetBtn = captionContainer.querySelector('.reset-position-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetCaptionPosition();
    });
  }
  
  // إظهار المقابض عند التمرير فوق الكابشن
  captionBox.addEventListener('mouseenter', () => {
    const resizeHandles = captionBox.querySelector('.resize-handles');
    if (resizeHandles) {
      resizeHandles.style.opacity = '1';
      resizeHandles.style.pointerEvents = 'auto';
    }
  });
  
  // إخفاء المقابض عند مغادرة الكابشن (بعد تأخير)
  captionBox.addEventListener('mouseleave', () => {
    const resizeHandles = captionBox.querySelector('.resize-handles');
    if (resizeHandles && !captionBox.classList.contains('caption-focus')) {
      setTimeout(() => {
        if (resizeHandles && !captionBox.classList.contains('caption-focus')) {
          resizeHandles.style.opacity = '';
          resizeHandles.style.pointerEvents = '';
        }
      }, 500);
    }
  });
}

// دوال إدارة موضع الكابشن
function saveCaptionPosition() {
  localStorage.setItem('captionPosition', JSON.stringify(captionPosition));
}

function loadCaptionPosition() {
  const saved = localStorage.getItem('captionPosition');
  if (saved) { 
    captionPosition = JSON.parse(saved); 
  }
}

function setCaptionPosition(x, y) {
  captionPosition.x = x; 
  captionPosition.y = y;
  if (captionContainer) {
    captionContainer.style.left = x + '%';
    captionContainer.style.top = y + '%';
    saveCaptionPosition();
  }
}

function resetCaptionPosition() {
  captionPosition = { x: 50, y: 90 };
  if (captionContainer) {
    captionContainer.style.left = '50%';
    captionContainer.style.top = '90%';
    saveCaptionPosition();
  }
  if (typeof write === 'function') write('تم إعادة تعيين موضع الكابشن إلى الوسط السفلي', 'success');
}

// دالة فرض تحديث الكابشن
function forceUpdateCaption() {
  if (!document.getElementById('player') || !window.vttCues || !window.vttCues.length || !captionBox) return;
  
  const currentTime = document.getElementById('player').currentTime;
  let activeIdx = -1;

  // البحث عن النص المناسب للوقت الحالي
  for (let i = 0; i < window.vttCues.length; i++) {
    const cue = window.vttCues[i];
    if (currentTime >= cue.start && currentTime < cue.end) {
      activeIdx = i;
      break;
    }
  }

  const newText = activeIdx >= 0 ? window.vttCues[activeIdx].text : '';
  captionBox.textContent = newText;
  captionContainer.style.display = newText ? 'block' : 'none';
  currentCaptionText = newText;
  
  // التأكد من وجود المقابض
  ensureResizeHandles();
  
  // تحديث التمييز في القائمة
  if (window.TranscriptEditor && activeIdx !== window.currentCueIndex && activeIdx >= 0) {
    if (window.VTTManager) {
      window.VTTManager.updateCurrentCueIndex(activeIdx);
    } else {
      window.currentCueIndex = activeIdx;
    }
    window.TranscriptEditor.highlightActiveCue(activeIdx);
  }
}

// تحديث نص الكابشن + تمييز السطر الحالي
function updateCaption() {
  if (!document.getElementById('player') || !window.vttCues || !window.vttCues.length || !captionBox) return;

  const currentTime = document.getElementById('player').currentTime;
  let activeIdx = -1;

  // البحث عن النص المناسب للوقت الحالي
  for (let i = 0; i < window.vttCues.length; i++) {
    const cue = window.vttCues[i];
    if (currentTime >= cue.start && currentTime < cue.end) {
      activeIdx = i;
      break;
    }
  }

  const newText = activeIdx >= 0 ? window.vttCues[activeIdx].text : '';
  if (newText !== currentCaptionText) {
    currentCaptionText = newText;
    
    // التحقق من وجود قالب الهايلايت كلمة بكلمة
    const selectedTemplate = window.TemplateManager?.getSelectedTemplate();
    if (selectedTemplate && (selectedTemplate.id === 'word-highlight' || selectedTemplate.id === 'yellow-sync-highlight') && selectedTemplate.wordHighlight?.enabled) {
      // إيقاف الهايلايت السابق
      if (window.TemplateManager?.stopWordHighlight) {
        window.TemplateManager.stopWordHighlight();
      }
      
      // تطبيق النص الجديد
      captionBox.textContent = newText;
      captionContainer.style.display = newText ? 'block' : 'none';
      
      // بدء الهايلايت الجديد إذا كان هناك نص
      if (newText && activeIdx >= 0) {
        const vttData = {
          start: window.vttCues[activeIdx].start,
          end: window.vttCues[activeIdx].end,
          text: newText
        };
        if (window.TemplateManager?.startWordHighlight) {
          window.TemplateManager.startWordHighlight(captionBox, selectedTemplate, vttData);
        }
      }
    } else {
      // التطبيق العادي للكابشن
      captionBox.textContent = newText;
      captionContainer.style.display = newText ? 'block' : 'none';
    }
    
    // التأكد من وجود المقابض عند تغيير النص
    if (newText) {
      ensureResizeHandles();
    }
  }

  if (window.TranscriptEditor && activeIdx !== window.currentCueIndex && activeIdx >= 0) {
    if (window.VTTManager) {
      window.VTTManager.updateCurrentCueIndex(activeIdx);
    } else {
      window.currentCueIndex = activeIdx;
    }
    window.TranscriptEditor.highlightActiveCue(activeIdx);
  }
}

// دالة التأكد من وجود مقابض تغيير الحجم
function ensureResizeHandles() {
  if (!captionBox || !captionContainer) return;
  
  // التحقق من وجود المقابض
  let resizeHandles = captionBox.querySelector('.resize-handles');
  if (!resizeHandles) {
    // إنشاء مقابض تغيير الحجم
    resizeHandles = document.createElement('div');
    resizeHandles.className = 'resize-handles';
    resizeHandles.setAttribute('aria-hidden', 'true');

    const handleDirections = ['nw', 'ne', 'e', 'se', 'sw', 'w'];
    handleDirections.forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `handle ${dir}`;
      handle.setAttribute('data-dir', dir);
      handle.title = `تغيير الحجم - ${dir}`;
      resizeHandles.appendChild(handle);
    });

    captionBox.appendChild(resizeHandles);
    
    // إعادة إعداد التفاعلات
    setupResizeHandlesInteractions();
  } else {
    // إذا كانت المقابض موجودة، تأكد من إعادة إعداد التفاعلات
    setupResizeHandlesInteractions();
  }
  
  // إظهار المقابض مؤقتاً للتأكد من عملها
  if (resizeHandles) {
    resizeHandles.style.opacity = '1';
    resizeHandles.style.pointerEvents = 'auto';
    
    // إخفاء المقابض بعد ثانيتين
    setTimeout(() => {
      if (resizeHandles) {
        resizeHandles.style.opacity = '';
        resizeHandles.style.pointerEvents = '';
      }
    }, 2000);
  }
}

// دالة إعداد تفاعلات المقابض
function setupResizeHandlesInteractions() {
  if (!captionBox) return;
  
  // متغيرات الحالة
  let resizing = false;
  let dir = null;
  let startX = 0, startY = 0;
  let stageRect = null;
  let velSpring = { w: 0, f: 0 };
  let springRAF = null;
  let target = { width: null, font: null };

  // متغيرات الحجم والخط
  let widthPc = 60;
  let fontPx = 20;
  const MIN_W = 20, MAX_W = 95;
  const MIN_FONT = 12, MAX_FONT = 60;

  // ثوابت الفيزياء
  const SPRING_K = 0.18, SPRING_D = 0.75;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // دالة النابض للتغيير
  function springStep() {
    const dt = 1;
    let needsUpdate = false;
    
    if (target.width != null) {
      const x = widthPc, g = target.width;
      const a = SPRING_K * (g - x) - SPRING_D * velSpring.w;
      velSpring.w += a * dt;
      widthPc += velSpring.w * dt;
      widthPc = clamp(widthPc, MIN_W, MAX_W);
      captionContainer.style.width = widthPc + '%';
      needsUpdate = true;
    }
    
    if (target.font != null) {
      const x = fontPx, g = target.font;
      const a = SPRING_K * (g - x) - SPRING_D * velSpring.f;
      velSpring.f += a * dt;
      fontPx += velSpring.f * dt;
      fontPx = clamp(fontPx, MIN_FONT, MAX_FONT);
      captionBox.style.fontSize = fontPx + 'px';
      needsUpdate = true;
    }
    
    const nearW = target.width == null || Math.abs(target.width - widthPc) < 0.05;
    const nearF = target.font == null || Math.abs(target.font - fontPx) < 0.05;
    
    if (nearW && nearF) {
      springRAF = null;
      return;
    }
    
    if (needsUpdate) {
      springRAF = requestAnimationFrame(springStep);
    }
  }

  // أحداث تغيير الحجم
  Array.from(captionBox.querySelectorAll('.handle')).forEach(handle => {
    // إزالة المستمعين السابقين
    handle.replaceWith(handle.cloneNode(true));
    const newHandle = captionBox.querySelector(`.handle.${handle.className.split(' ')[1]}`);
    
    newHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dir = newHandle.dataset.dir;
      resizing = true;
      newHandle.setPointerCapture(e.pointerId);
      stageRect = document.getElementById('player').getBoundingClientRect();
      const startRX = e.clientX;
      const startRY = e.clientY;
      const w0 = widthPc;
      const f0 = fontPx;
      if (springRAF) { cancelAnimationFrame(springRAF); springRAF = null; }
      velSpring.w = 0; velSpring.f = 0;
      captionBox.classList.add('caption-focus');
      document.body.style.userSelect = 'none';
      e.preventDefault();

      function onMove(ev) {
        if (!resizing) return;
        const dx = ev.clientX - startRX;
        const dy = ev.clientY - startRY;
        let nextW = widthPc, nextF = fontPx;
        
        // تغيير العرض (الجانبين)
        if (dir.includes('e') || dir.includes('w')) {
          const dPct = (dx / stageRect.width) * 100 * (dir.includes('e') ? 1 : -1);
          nextW = Math.max(20, Math.min(95, w0 + dPct));
        }
        
        // تغيير حجم الخط فقط (الأعلى والأسفل) - بدون تغيير العرض
        if (dir.includes('n') || dir.includes('s')) {
          const sign = dir.includes('s') ? 1 : -1;
          const dScale = 1 + (sign * dy) / 320;
          const newFont = Math.max(12, Math.min(60, f0 * dScale));
          nextF = newFont;
          // لا نغير العرض - نتركه كما هو
          nextW = widthPc;
        }
        
        // تطبيق التغييرات فوراً
        widthPc = nextW;
        fontPx = nextF;
        captionContainer.style.width = widthPc + '%';
        captionBox.style.fontSize = fontPx + 'px';
      }

      function onUp() {
        resizing = false;
        dir = null;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
        captionBox.classList.remove('caption-focus');
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  });
}

// تصدير الدوال للاستخدام في الملفات الأخرى
window.CaptionSystem = {
  createCaptionSystem,
  setupCaptionInteractions,
  saveCaptionPosition,
  loadCaptionPosition,
  setCaptionPosition,
  resetCaptionPosition,
  forceUpdateCaption,
  updateCaption,
  ensureResizeHandles,
  setupResizeHandlesInteractions,
  getCaptionBox: () => captionBox,
  getCaptionContainer: () => captionContainer,
  getCaptionPosition: () => captionPosition
};

// إضافة إلى النطاق العام
window.CaptionSystem = CaptionSystem;
