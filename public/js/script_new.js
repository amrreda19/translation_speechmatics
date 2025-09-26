  // انتظار تحميل الصفحة قبل تنفيذ الكود
document.addEventListener('DOMContentLoaded', function() {
  // عناصر DOM
  const fileInput = document.getElementById('file');
  const fileInput2 = document.getElementById('file2');
  const player = document.getElementById('player');
  const log = document.getElementById('log');
  const statusTxt = document.getElementById('statusTxt');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const templateOptions = document.getElementById('templateOptions');
  const applyTemplateBtn = document.getElementById('applyTemplateBtn');
  const refreshTpl = document.getElementById('refreshTpl');
  const playPause = document.getElementById('playPause');
  const fitBtn = document.getElementById('fit');
  const muteBtn = document.getElementById('mute');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');
  const videoWrapEl = document.getElementById('videoWrap');

  // عناصر تبويبات الشريط الجانبي
  const tabTemplates = document.getElementById('tabTemplates');
  const tabEditor = document.getElementById('tabEditor');
  const editorPanel = document.getElementById('editorPanel');
  const templatesSearchWrap = document.getElementById('templatesSearchWrap');
  const editorToolbar = document.getElementById('editorToolbar');
  const editorSearch = document.getElementById('editorSearch');
  const cueListEl = document.getElementById('cueList');
  const cueSearchInput = document.getElementById('cueSearchInput');
  const jumpPrevBtn = document.getElementById('jumpPrev');
  const jumpNextBtn = document.getElementById('jumpNext');
  const addCueBtn = document.getElementById('addCueBtn');

  // حالة
  let currentTrack = null;
  let selectedTemplate = null;
  let templates = null;
  let vttBlobUrl = null;

  // حالة نظام الكابشن المحسن
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let captionPosition = { x: 50, y: 88 }; // موضع افتراضي (وسط أسفل)
  let captionContainer = null;
  let captionBox = null;
  let currentCaptionText = '';
  let vttCues = [];
  let currentCueIndex = -1;

  // أدوات مساعدة
  function write(msg, type='info'){
    const icon = type==='success' ? '✅' : type==='error' ? '⛔' : type==='loading' ? '⏳' : 'ℹ️';
    log.textContent = `${icon} ${msg}`;
    statusTxt.innerHTML = `${icon} ${msg}`;
  }
  function showProgress(show){ progressBar.style.display = show ? 'block' : 'none'; if(show) progressFill.style.width = '0%'; }
  function updateProgress(p){ progressFill.style.width = p + '%'; }
  function formatSize(bytes){ const k=1024, units=['B','KB','MB','GB']; let i=Math.floor(Math.log(bytes)/Math.log(k)); return (bytes/Math.pow(k,i)).toFixed(2)+' '+units[i]; }
  function s2ts(s){ // seconds to timestamp mm:ss.mmm
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = (s%60).toFixed(3).padStart(6,'0');
    return (h? String(h).padStart(2,'0')+':':'') + String(m).padStart(2,'0') + ':' + sec;
  }

  // دوال نظام الكابشن المحسن
  function createCaptionSystem() {
  if (!currentTrack) return;

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
  parseVTTFile();

  write('تم إنشاء نظام الكابشن المحسن بنجاح', 'success');
}

  // إعداد تفاعلات الكابشن (السحب/الحجم) — (كما هي في نسختك الأصلية)
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
    if (captionPosition.x < 3) { captionPosition.x = 3; vel.vx = -vel.vx * BOUNCE; bounced = True; }
    if (captionPosition.x > 97) { captionPosition.x = 97; vel.vx = -vel.vx * BOUNCE; bounced = True; }
    if (captionPosition.y < 3) { captionPosition.y = 3; vel.vy = -vel.vy * BOUNCE; bounced = True; }
    if (captionPosition.y > 97) { captionPosition.y = 97; vel.vy = -vel.vy * BOUNCE; bounced = True; }

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
    stageRect = player.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    lastMoveTime = performance.now();
    if (inertialRAF) { cancelAnimationFrame(inertialRAF); inertialRAF = null; }
    vel.vx = 0; vel.vy = 0;
    captionBox.classList.add('caption-focus');
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
      stageRect = player.getBoundingClientRect();
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
    write('تم إعادة تعيين موضع وحجم الكابشن', 'success');
  }

  // ربط زر إعادة التعيين
  const resetBtn = captionContainer.querySelector('.reset-position-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetCaptionPosition();
    });
  }
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
  write('تم إعادة تعيين موضع الكابشن إلى الوسط السفلي', 'success');
}

  // دالة تحليل ملف VTT
  function parseVTTFile() {
  if (!currentTrack || !vttBlobUrl) return;

  fetch(vttBlobUrl)
    .then(response => response.text())
    .then(vttText => {
      vttCues = parseVTTText(vttText);
      setupCaptionSync();
      renderTranscriptList(); // 🔴 بناء قائمة الجُمل في تبويب التحرير
      write(`تم تحليل ${vttCues.length} نص ترجمة`, 'success');
    })
    .catch(error => {
      console.error('خطأ في تحليل ملف VTT:', error);
      write('خطأ في تحليل ملف الترجمة', 'error');
    });
}

  // دالة تحليل نص VTT
  function parseVTTText(vttText) {
  const cues = [];
  const lines = vttText.split('\n');
  let currentCue = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // تخطي الرأس
    if (line === 'WEBVTT' || line === '') continue;

    // البحث عن توقيت
    if (line.includes('-->')) {
      const parts = line.split('-->');
      if (parts.length === 2) {
        const startTime = parts[0].trim();
        const endTime = parts[1].trim();
        if (currentCue) cues.push(currentCue);
        currentCue = {
          start: timeToSeconds(startTime),
          end: timeToSeconds(endTime),
          text: ''
        };
      }
    } else if (currentCue && line !== '') {
      currentCue.text += (currentCue.text ? ' ' : '') + line;
    }
  }

  if (currentCue) cues.push(currentCue);
  return cues;
}

  // تحويل الوقت إلى ثواني
  function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

  // 🔴 بناء قائمة الجُمل (تحرير النصوص)
  function renderTranscriptList(filter='') {
  cueListEl.innerHTML = '';
  if (!vttCues.length) {
    const empty = document.createElement('div');
    empty.style.cssText='opacity:.7;padding:10px;text-align:center';
    empty.textContent = 'لا توجد ترجمات بعد. ارفع فيديو ليتم التفريغ.';
    cueListEl.appendChild(empty);
    return;
  }
  const q = filter.trim();
  const list = vttCues.map((cue, idx) => ({...cue, idx}))
    .filter(c => !q || (c.text && c.text.includes(q)));

  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'cue-item';
    item.dataset.idx = c.idx;

    const t = document.createElement('div');
    t.className = 'cue-time';
    t.innerHTML = `<i class="fa-regular fa-clock"></i> ${s2ts(c.start)} → ${s2ts(c.end)}`;

    const txt = document.createElement('div');
    txt.className = 'cue-text';
    txt.contentEditable = true;
    txt.textContent = c.text;
    txt.setAttribute('data-original', c.text);

    // إضافة أزرار التحكم
    const controls = document.createElement('div');
    controls.className = 'cue-controls';
    controls.style.cssText = 'display:flex; gap:4px; margin-top:6px; opacity:0; transition:opacity 0.2s;';
    
    // تم إزالة أزرار الحفظ والإلغاء - الحفظ تلقائي الآن

    const playBtn = document.createElement('button');
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playBtn.title = 'الانتقال للوقت وتشغيل الفيديو';
    playBtn.className = 'btn';
    playBtn.style.cssText = 'padding:4px 8px; font-size:12px; background:#3b82f6;';
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCue(c.idx, true); // الانتقال مع التشغيل
      write(`تشغيل الجملة ${c.idx + 1} في الوقت ${s2ts(c.start)}`, 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.title = 'حذف الجملة';
    deleteBtn.className = 'btn';
    deleteBtn.style.cssText = 'padding:4px 8px; font-size:12px; background:#ef4444;';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCue(c.idx);
    });

    controls.appendChild(playBtn);
    controls.appendChild(deleteBtn);

    item.appendChild(t);
    item.appendChild(txt);
    item.appendChild(controls);

    // إظهار أزرار التحكم عند التحرير
    txt.addEventListener('focus', () => {
      controls.style.opacity = '1';
      item.classList.add('editing');
    });

    txt.addEventListener('blur', () => {
      setTimeout(() => {
        if (!txt.matches(':focus')) {
          controls.style.opacity = '0';
          item.classList.remove('editing');
        }
      }, 200);
    });

    // حفظ تلقائي عند تغيير النص
    txt.addEventListener('input', () => {
      saveCueText(c.idx, txt.textContent);
    });

    // النقر على العنصر للانتقال للوقت
    item.addEventListener('click', (e) => {
      if (!txt.matches(':focus')) {
        
        selectCue(c.idx, false); // الانتقال للوقت بدون تشغيل
      }
    });

    // النقر على النص نفسه للانتقال للوقت
    txt.addEventListener('click', (e) => {
      e.stopPropagation();

      selectCue(c.idx, false); // الانتقال للوقت بدون تشغيل
    });

    cueListEl.appendChild(item);
  });

  // إعادة تمييز العنصر الحالي إن كان معروفًا
  if (currentCueIndex >= 0) highlightActiveCue(currentCueIndex);
}

  function highlightActiveCue(idx) {
  [...cueListEl.querySelectorAll('.cue-item')].forEach(el => el.classList.remove('active'));
  const el = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
  if (el) {
    el.classList.add('active');
    // تمرير إلى العنصر داخل القائمة
    el.scrollIntoView({block:'nearest', behavior:'smooth'});
  }
}

  function selectCue(idx, seek=false) {
  if (idx < 0 || idx >= vttCues.length) return;
  
  currentCueIndex = idx;
  highlightActiveCue(idx);
  
  // إزالة التمييز السابق
  [...cueListEl.querySelectorAll('.cue-item')].forEach(el => el.classList.remove('selected'));
  
  // إضافة تمييز للعنصر المحدد
  const selectedItem = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
    // تمرير إلى العنصر المحدد في القائمة
    selectedItem.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }
  
  // لا نغيّر النص هنا؛ نتركه لإدارة المزامنة الزمنية forceUpdateCaption
  
  // الانتقال للوقت المحدد
  if (vttCues[idx] && player) {
    const cue = vttCues[idx];
    const epsilonEnter = 0.08; // إزاحة دخول بسيطة داخل المدى
    const epsilonLeave = 0.01; // هامش خروج من نهاية الجملة
    const duration = Math.max(0, cue.end - cue.start);
    const candidateEnter = cue.start + Math.min(epsilonEnter, duration * 0.6);
    const candidateLeave = cue.end - epsilonLeave;
    let targetTime = Math.min(candidateLeave, candidateEnter);
    targetTime = Math.max(cue.start + 0.001, Math.min(targetTime, cue.end - 0.001));
    
    player.currentTime = targetTime;
    // مزامنة العرض بدقة مع الوقت الحالي بعد القفز
    setTimeout(() => { try { forceUpdateCaption(); } catch(e){} }, 0);
    
    if (seek) {
      // تشغيل الفيديو إذا كان متوقفاً
      if (player.paused) {
        player.play().catch(e => console.log('لا يمكن تشغيل الفيديو:', e));
      }
      
      // تحديث أيقونة التشغيل
      const playPauseBtn = document.getElementById('playPause');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }
      
      write(`انتقل إلى الوقت: ${s2ts(targetTime)}`, 'success');
    } else {
      // إيقاف الفيديو عند النقر على النص
      if (!player.paused) {
        player.pause();
      }
      
      // تحديث أيقونة التشغيل
      const playPauseBtn = document.getElementById('playPause');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
      
      write(`انتقل إلى الوقت: ${s2ts(targetTime)} (متوقف)`, 'info');
    }
  }
}

  // دالة حفظ تعديل النص
  function saveCueText(idx, newText) {
  if (idx >= 0 && idx < vttCues.length) {
    vttCues[idx].text = newText.trim();
    
    // تحديث النص في الكابشن فوراً
    if (captionBox) {
      captionBox.textContent = newText.trim();
      captionContainer.style.display = 'block';
      currentCaptionText = newText.trim(); // تحديث المتغير للمقارنة
    }
    
    // تحديث ملف VTT
    updateVTTFile();
    
    // تحديث العنصر في القائمة
    const item = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
    if (item) {
      const txt = item.querySelector('.cue-text');
      txt.setAttribute('data-original', newText.trim());
    }
    
    // لا نحتاج forceUpdateCaption هنا لأننا نريد إظهار النص المحرر
    
    write(`تم حفظ تعديل الجملة ${idx + 1}`, 'success');
  }
}

  // دالة حذف الجملة
  function deleteCue(idx) {
  if (idx >= 0 && idx < vttCues.length) {
    if (confirm(`هل تريد حذف الجملة "${vttCues[idx].text.substring(0, 50)}..."؟`)) {
      vttCues.splice(idx, 1);
      
      // تحديث الفهرس الحالي
      if (currentCueIndex >= idx) {
        currentCueIndex = Math.max(0, currentCueIndex - 1);
      }
      
      // إعادة بناء القائمة
      renderTranscriptList();
      
      // تحديث ملف VTT
      updateVTTFile();
      
      // فرض تحديث الكابشن
      setTimeout(() => forceUpdateCaption(), 100);
      
      // تحديث النص الظاهر في الفيديو فوراً
      if (captionBox && vttCues.length > 0) {
        if (currentCueIndex >= 0 && currentCueIndex < vttCues.length) {
      // إظهار النص الحالي
      captionBox.textContent = vttCues[currentCueIndex].text;
      captionContainer.style.display = 'block';
      currentCaptionText = vttCues[currentCueIndex].text; // تحديث المتغير
        } else {
          // إخفاء الكابشن إذا لم تعد هناك جمل
          captionContainer.style.display = 'none';
          currentCaptionText = ''; // إعادة تعيين المتغير
        }
      } else if (captionBox) {
        // إخفاء الكابشن إذا لم تعد هناك جمل
        captionContainer.style.display = 'none';
        currentCaptionText = ''; // إعادة تعيين المتغير
      }
      
      write(`تم حذف الجملة ${idx + 1}`, 'success');
    }
  }
}

  // دالة تحديث ملف VTT
  function updateVTTFile() {
  if (!vttCues.length) return;
  
  let vttContent = 'WEBVTT\n\n';
  
  vttCues.forEach(cue => {
    const startTime = secondsToTime(cue.start);
    const endTime = secondsToTime(cue.end);
    vttContent += `${startTime} --> ${endTime}\n${cue.text}\n\n`;
  });
  
  // إنشاء ملف VTT جديد
  if (vttBlobUrl) {
    URL.revokeObjectURL(vttBlobUrl);
  }
  
  const blob = new Blob([vttContent], {type: 'text/vtt'});
  vttBlobUrl = URL.createObjectURL(blob);
  
  // تحديث مصدر الترجمة
  if (currentTrack) {
    currentTrack.src = vttBlobUrl;
  }
}

  // دالة تحويل الثواني إلى توقيت VTT
  function secondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs}`;
}

  // دالة إضافة جملة جديدة
  function addNewCue() {
  if (!player) {
    write('يرجى رفع فيديو أولاً', 'error');
    return;
  }

  const currentTime = player.currentTime;
  const newCue = {
    start: currentTime,
    end: currentTime + 3, // مدة افتراضية 3 ثوان
    text: 'نص جديد...'
  };

  // إدراج الجملة في المكان المناسب حسب الوقت
  let insertIndex = vttCues.length;
  for (let i = 0; i < vttCues.length; i++) {
    if (vttCues[i].start > currentTime) {
      insertIndex = i;
      break;
    }
  }

  vttCues.splice(insertIndex, 0, newCue);
  
  // إعادة بناء القائمة
  renderTranscriptList();
  
  // تحديث ملف VTT
  updateVTTFile();
  
  // تحديد الجملة الجديدة
  selectCue(insertIndex, false);
  
  // إظهار النص في الفيديو فوراً
  if (captionBox) {
    captionBox.textContent = newCue.text;
    captionContainer.style.display = 'block';
    currentCaptionText = newCue.text; // تحديث المتغير للمقارنة
  }
  
  // التركيز على النص للتحرير
  setTimeout(() => {
    const item = cueListEl.querySelector(`.cue-item[data-idx="${insertIndex}"]`);
    if (item) {
      const txt = item.querySelector('.cue-text');
      txt.focus();
      txt.select();
    }
  }, 100);

  write(`تم إضافة جملة جديدة في الوقت ${s2ts(currentTime)}`, 'success');
}

  // إعداد مزامنة الكابشن
  function setupCaptionSync() {
  if (!player || !vttCues.length) return;
  player.addEventListener('timeupdate', updateCaption);
  player.addEventListener('seeked', updateCaption);
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
      stageRect = player.getBoundingClientRect();
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

  // دالة فرض تحديث الكابشن
  function forceUpdateCaption() {
  if (!player || !vttCues.length || !captionBox) return;
  
  const currentTime = player.currentTime;
  let activeIdx = -1;

  // البحث عن النص المناسب للوقت الحالي
  for (let i = 0; i < vttCues.length; i++) {
    const cue = vttCues[i];
    if (currentTime >= cue.start && currentTime < cue.end) { // تفضيل الجملة التالية عند الحدود
      activeIdx = i;
      break;
    }
  }

  const newText = activeIdx >= 0 ? vttCues[activeIdx].text : '';
  captionBox.textContent = newText;
  captionContainer.style.display = newText ? 'block' : 'none';
  currentCaptionText = newText;
  
  // التأكد من وجود المقابض
  ensureResizeHandles();
  
  // تحديث التمييز في القائمة
  if (activeIdx !== currentCueIndex && activeIdx >= 0) {
    currentCueIndex = activeIdx;
    highlightActiveCue(activeIdx);
  }
}

  // تحديث نص الكابشن + تمييز السطر الحالي
  function updateCaption() {
  if (!player || !vttCues.length || !captionBox) return;

  const currentTime = player.currentTime;
  let activeIdx = -1;

  // البحث عن النص المناسب للوقت الحالي
  for (let i = 0; i < vttCues.length; i++) {
    const cue = vttCues[i];
    if (currentTime >= cue.start && currentTime < cue.end) { // تفضيل الجملة التالية عند الحدود
      activeIdx = i;
      break;
    }
  }

  const newText = activeIdx >= 0 ? vttCues[activeIdx].text : '';
  if (newText !== currentCaptionText) {
    currentCaptionText = newText;
    captionBox.textContent = newText;
    captionContainer.style.display = newText ? 'block' : 'none';
    
    // التأكد من وجود المقابض عند تغيير النص
    if (newText) {
      ensureResizeHandles();
    }
  }

  if (activeIdx !== currentCueIndex && activeIdx >= 0) {
    currentCueIndex = activeIdx;
    highlightActiveCue(activeIdx);
  }
}

  // تحميل القوالب
  async function loadTemplates(){
  try{
    const resp = await fetch('captionTemplates.json', {cache:'no-store'});
    templates = await resp.json();
    renderTemplateOptions();
    write('تم تحميل القوالب بنجاح.', 'success');
  }catch(e){
    console.error(e);
    write('خطأ في تحميل قوالب الترجمة.', 'error');
  }
}

  function templateDescription(id){
  const map = {
    'classic-white':'كلاسيكي أبيض بسيط',
    'tiktok-style':'ملوّن بأسلوب تيك توك',
    'karaoke':'كاريوكي مع تمييز الكلمات',
    'capsule':'كبسولة أنيقة'
  };
  return map[id] || '';
}

  function renderTemplateOptions(filter=''){
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
      applyTemplateBtn.disabled = false;
      write(`تم اختيار قالب: ${t.name}`, 'success');
      // تطبيق فوري إن كانت هناك ترجمة
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

  function applyTemplateStyles(tpl){
  if(!tpl) return;

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

    write(`تم تطبيق القالب: ${tpl.name}`, 'success');
  }
}

  function attachLocalVideo(file){
  const url = URL.createObjectURL(file);
  player.src = url;
  write(`تم اختيار ملف: ${file.name} (${formatSize(file.size)})`, 'success');
}

  async function transcribe(file){
  showProgress(true);
  write('جاري الرفع والمعالجة…', 'loading');

  // تقدم وهمي حتى 90%
  let p=0;
  const iv = setInterval(()=>{ p = Math.min(90, p + Math.random()*12); updateProgress(Math.round(p)); }, 450);

  try{
    const fd = new FormData();
    fd.append('video', file);

    const resp = await fetch('/api/transcribe', {method:'POST', body:fd});
    const data = await resp.json();

    clearInterval(iv); updateProgress(100);

    if(!resp.ok){
      const detailsStr = data?.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : '';
      const statusStr = data?.status ? ` (HTTP ${data.status})` : '';
      const message = `${data?.error || 'unknown'}${statusStr}${detailsStr ? ' - ' + detailsStr : ''}`;
      console.error('Transcribe error response:', data);
      write(`خطأ: ${message}`, 'error');
      showProgress(false);
      return;
    }

    const vttText = data.vtt || '';
    if(!vttText.trim()){
      write('لم يتم استلام ملف ترجمة VTT.', 'error');
      showProgress(false);
      return;
    }

    // نظّف مصدر قديم
    if(vttBlobUrl){ URL.revokeObjectURL(vttBlobUrl); vttBlobUrl = null; }
    currentTrack?.remove();

    const blob = new Blob([vttText], {type:'text/vtt'});
    vttBlobUrl = URL.createObjectURL(blob);

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'العربية';
    track.srclang = 'ar';
    track.default = false; // تعطيل العرض التلقائي
    track.src = vttBlobUrl;
    player.appendChild(track);
    currentTrack = track;

    if(selectedTemplate){ applyTemplateStyles(selectedTemplate); }

    // إنشاء نظام الكابشن المحسن
    loadCaptionPosition();
    createCaptionSystem();

    write('تم التحويل بنجاح! شغّل الفيديو لمشاهدة الترجمة.', 'success');
    setTimeout(()=> showProgress(false), 1200);

    // افتح تبويب "تحرير النصوص" تلقائيًا بعد النجاح
    switchToEditorTab();

  }catch(e){
    clearInterval(iv);
    showProgress(false);
    write('فشل الاتصال بالخادم: ' + e.message, 'error');
  }
}

  // أحداث اختيار الملف
  function onFilePicked(e){
  const file = e.target.files?.[0];
  if(!file) return;
  attachLocalVideo(file);
  transcribe(file);
  applyTemplateBtn.disabled = !selectedTemplate;
}

fileInput.addEventListener('change', onFilePicked);
fileInput2.addEventListener('change', onFilePicked);

refreshTpl.addEventListener('click', ()=> loadTemplates());
applyTemplateBtn.addEventListener('click', ()=>{
  if(selectedTemplate && currentTrack){ applyTemplateStyles(selectedTemplate); write(`طُبّق القالب: ${selectedTemplate.name}`, 'success'); }
  else if(!selectedTemplate){ write('من فضلك اختر قالباً أولاً.', 'error'); }
  else{ write('لا يوجد تراك ترجمة مطبق.', 'error'); }
});

playPause.addEventListener('click', ()=>{
  if(player.paused){ player.play(); playPause.innerHTML='<i class="fa-solid fa-pause"></i>'; }
  else{ player.pause(); playPause.innerHTML='<i class="fa-solid fa-play"></i>'; }
});

fitBtn.addEventListener('click', ()=>{
  if(!videoWrapEl) return;
  videoWrapEl.classList.toggle('small');
  write(videoWrapEl.classList.contains('small') ? 'تم تصغير الفيديو.' : 'تم تكبير الفيديو.', 'success');
});

muteBtn.addEventListener('click', ()=>{
  player.muted = !player.muted;
  muteBtn.innerHTML = player.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
});

exportBtn.addEventListener('click', ()=>{
  if(!vttBlobUrl){ write('لا يوجد ملف ترجمة للتصدير.', 'error'); return; }
  const a = document.createElement('a');
  a.href = vttBlobUrl;
  a.download = 'subtitles.vtt';
  a.click();
  write('تم تنزيل ملف الترجمة.', 'success');
});


searchInput.addEventListener('input', (e)=>{ renderTemplateOptions(e.target.value.trim()); });

  // 🔴 تبويبات: القوالب / التحرير
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
  function switchToEditorTab(){
  // إظهار التبويبات بعد رفع الفيديو
  document.getElementById('sideTabs').style.display = 'flex';
  document.getElementById('welcomeMessage').style.display = 'none';
  
  tabEditor.classList.add('active');
  tabTemplates.classList.remove('active');
  templateOptions.style.display = 'none';
  templatesSearchWrap.style.display = 'none';
  refreshTpl.style.display = 'none';
  editorPanel.style.display = 'flex';
  editorToolbar.style.display = 'flex';
  editorSearch.style.display = 'block';
}
tabTemplates.addEventListener('click', switchToTemplatesTab);
tabEditor.addEventListener('click', switchToEditorTab);


  // 🔴 بحث داخل الجمل
cueSearchInput.addEventListener('input', (e)=>{
  renderTranscriptList(e.target.value || '');
});

  // 🔴 تنقّل سريع بين الجمل
jumpPrevBtn.addEventListener('click', ()=>{
  if (!vttCues.length) return;
  const idx = Math.max(0, (currentCueIndex > 0 ? currentCueIndex - 1 : 0));
  selectCue(idx, true);
  write(`انتقل إلى الجملة ${idx + 1} من ${vttCues.length}`, 'info');
});
jumpNextBtn.addEventListener('click', ()=>{
  if (!vttCues.length) return;
  const idx = Math.min(vttCues.length - 1, (currentCueIndex >= 0 ? currentCueIndex + 1 : 0));
  selectCue(idx, true);
  write(`انتقل إلى الجملة ${idx + 1} من ${vttCues.length}`, 'info');
});

  // زر إضافة جملة جديدة
addCueBtn.addEventListener('click', addNewCue);

  // سحب وإفلات فوق اللوحة الوسطى
  const stage = document.getElementById('stage');
  ;['dragenter','dragover'].forEach(evt=>{
  stage.addEventListener(evt, e=>{ e.preventDefault(); stage.style.outline='2px dashed #3b82f6'; });
});
  ;['dragleave','drop'].forEach(evt=>{
  stage.addEventListener(evt, e=>{ e.preventDefault(); stage.style.outline='none'; });
});
stage.addEventListener('drop', e=>{
  const file = e.dataTransfer?.files?.[0];
  if(file && file.type.startsWith('video/')){
    attachLocalVideo(file);
    transcribe(file);
  }else{
    write('رجاءً أفلت ملف فيديو صالح.', 'error');
  }
});

  // بدء التشغيل
loadTemplates();
loadCaptionPosition(); // تحميل الموضع المحفوظ
write('جاهز. ارفع فيديو أو اسحب ملفك إلى مساحة العمل.');
});
