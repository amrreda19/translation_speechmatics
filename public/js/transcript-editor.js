// محرر النصوص والترجمة
// Transcript Editor

// بناء قائمة الجُمل (تحرير النصوص)
function renderTranscriptList(filter='') {
  const cueListEl = document.getElementById('cueList');
  if (!cueListEl) return;
  
  cueListEl.innerHTML = '';
  if (!window.vttCues || !window.vttCues.length) {
    const empty = document.createElement('div');
    empty.style.cssText='opacity:.7;padding:10px;text-align:center';
    empty.textContent = 'لا توجد ترجمات بعد. ارفع فيديو ليتم التفريغ.';
    cueListEl.appendChild(empty);
    return;
  }
  
  const q = filter.trim();
  const list = window.vttCues.map((cue, idx) => ({...cue, idx}))
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

    const playBtn = document.createElement('button');
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playBtn.title = 'الانتقال للوقت وتشغيل الفيديو';
    playBtn.className = 'btn';
    playBtn.style.cssText = 'padding:4px 8px; font-size:12px; background:#3b82f6;';
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCue(c.idx, true); // الانتقال مع التشغيل
      if (typeof write === 'function') write(`تشغيل الجملة ${c.idx + 1} في الوقت ${s2ts(c.start)}`, 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.title = 'حذف الجملة';
    deleteBtn.className = 'btn';
    deleteBtn.style.cssText = 'padding:4px 8px; font-size:12px; background:#ef4444;';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.VTTManager) {
        window.VTTManager.deleteCue(c.idx);
      }
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
      if (window.VTTManager) {
        window.VTTManager.saveCueText(c.idx, txt.textContent);
      }
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
  if (window.currentCueIndex >= 0) highlightActiveCue(window.currentCueIndex);
}

function highlightActiveCue(idx) {
  const cueListEl = document.getElementById('cueList');
  if (!cueListEl) return;
  
  [...cueListEl.querySelectorAll('.cue-item')].forEach(el => el.classList.remove('active'));
  const el = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
  if (el) {
    el.classList.add('active');
    // تمرير إلى العنصر داخل القائمة
    el.scrollIntoView({block:'nearest', behavior:'smooth'});
  }
}

function selectCue(idx, seek=false) {
  if (idx < 0 || idx >= window.vttCues.length) return;
  
  if (window.VTTManager) {
    window.VTTManager.updateCurrentCueIndex(idx);
  } else {
    window.currentCueIndex = idx;
  }
  highlightActiveCue(idx);
  
  // إزالة التمييز السابق
  const cueListEl = document.getElementById('cueList');
  if (cueListEl) {
    [...cueListEl.querySelectorAll('.cue-item')].forEach(el => el.classList.remove('selected'));
    
    // إضافة تمييز للعنصر المحدد
    const selectedItem = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
      // تمرير إلى العنصر المحدد في القائمة
      selectedItem.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }
  
  // الانتقال للوقت المحدد
  const player = document.getElementById('player');
  if (window.vttCues[idx] && player) {
    const cue = window.vttCues[idx];
    const epsilonEnter = 0.08; // إزاحة دخول بسيطة داخل المدى
    const epsilonLeave = 0.01; // هامش خروج من نهاية الجملة
    const duration = Math.max(0, cue.end - cue.start);
    const candidateEnter = cue.start + Math.min(epsilonEnter, duration * 0.6);
    const candidateLeave = cue.end - epsilonLeave;
    let targetTime = Math.min(candidateLeave, candidateEnter);
    targetTime = Math.max(cue.start + 0.001, Math.min(targetTime, cue.end - 0.001));
    
    player.currentTime = targetTime;
    // مزامنة العرض بدقة مع الوقت الحالي بعد القفز
    setTimeout(() => { 
      try { 
        if (window.CaptionSystem) {
          window.CaptionSystem.forceUpdateCaption(); 
        }
      } catch(e){} 
    }, 0);
    
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
      
      if (typeof write === 'function') write(`انتقل إلى الوقت: ${s2ts(targetTime)}`, 'success');
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
      
      if (typeof write === 'function') write(`انتقل إلى الوقت: ${s2ts(targetTime)} (متوقف)`, 'info');
    }
  }
}

// دالة مساعدة لتحويل الثواني إلى توقيت
function s2ts(s) { // seconds to timestamp mm:ss.mmm
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = (s%60).toFixed(3).padStart(6,'0');
  return (h? String(h).padStart(2,'0')+':':'') + String(m).padStart(2,'0') + ':' + sec;
}

// إعداد مستمعي الأحداث لمحرر النصوص
function setupTranscriptEditorEventListeners() {
  // البحث داخل الجمل
  const cueSearchInput = document.getElementById('cueSearchInput');
  if (cueSearchInput) {
    cueSearchInput.addEventListener('input', (e) => {
      renderTranscriptList(e.target.value || '');
    });
  }

  // تنقّل سريع بين الجمل
  const jumpPrevBtn = document.getElementById('jumpPrev');
  if (jumpPrevBtn) {
    jumpPrevBtn.addEventListener('click', () => {
      if (!window.vttCues || !window.vttCues.length) return;
      const idx = Math.max(0, (window.currentCueIndex > 0 ? window.currentCueIndex - 1 : 0));
      selectCue(idx, true);
      if (typeof write === 'function') write(`انتقل إلى الجملة ${idx + 1} من ${window.vttCues.length}`, 'info');
    });
  }

  const jumpNextBtn = document.getElementById('jumpNext');
  if (jumpNextBtn) {
    jumpNextBtn.addEventListener('click', () => {
      if (!window.vttCues || !window.vttCues.length) return;
      const idx = Math.min(window.vttCues.length - 1, (window.currentCueIndex >= 0 ? window.currentCueIndex + 1 : 0));
      selectCue(idx, true);
      if (typeof write === 'function') write(`انتقل إلى الجملة ${idx + 1} من ${window.vttCues.length}`, 'info');
    });
  }

  // زر إضافة جملة جديدة
  const addCueBtn = document.getElementById('addCueBtn');
  if (addCueBtn) {
    addCueBtn.addEventListener('click', () => {
      if (window.VTTManager) {
        window.VTTManager.addNewCue();
      }
    });
  }
}

// تصدير الدوال للاستخدام في الملفات الأخرى
window.TranscriptEditor = {
  renderTranscriptList,
  highlightActiveCue,
  selectCue,
  s2ts,
  setupTranscriptEditorEventListeners
};
