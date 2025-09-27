// مشغل الفيديو وإدارة الملفات
// Video Player Management

// دالة رفع الفيديو المحلي
function attachLocalVideo(file) {
  const player = document.getElementById('player');
  if (!player) return;
  
  const url = URL.createObjectURL(file);
  player.src = url;
  if (typeof write === 'function') write(`تم اختيار ملف: ${file.name} (${formatSize(file.size)})`, 'success');
}

// دالة التحويل والتفريغ
async function transcribe(file) {
  if (typeof showProgress === 'function') showProgress(true);
  if (typeof write === 'function') write('جاري الرفع والمعالجة…', 'loading');

  // تقدم وهمي حتى 90%
  let p = 0;
  const iv = setInterval(() => { 
    p = Math.min(90, p + Math.random() * 12); 
    if (typeof updateProgress === 'function') updateProgress(Math.round(p)); 
  }, 450);

  try {
    const fd = new FormData();
    fd.append('video', file);

    const resp = await fetch('/api/transcribe', { method: 'POST', body: fd });
    const data = await resp.json();

    clearInterval(iv);
    if (typeof updateProgress === 'function') updateProgress(100);

    if (!resp.ok) {
      const detailsStr = data?.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : '';
      const statusStr = data?.status ? ` (HTTP ${data.status})` : '';
      const message = `${data?.error || 'unknown'}${statusStr}${detailsStr ? ' - ' + detailsStr : ''}`;
      console.error('Transcribe error response:', data);
      if (typeof write === 'function') write(`خطأ: ${message}`, 'error');
      if (typeof showProgress === 'function') showProgress(false);
      return;
    }

    const vttText = data.vtt || '';
    if (!vttText.trim()) {
      if (typeof write === 'function') write('لم يتم استلام ملف ترجمة VTT.', 'error');
      if (typeof showProgress === 'function') showProgress(false);
      return;
    }

    // نظّف مصدر قديم
    if (window.VTTManager && window.VTTManager.getVttBlobUrl()) {
      URL.revokeObjectURL(window.VTTManager.getVttBlobUrl());
      window.VTTManager.setVttBlobUrl(null);
    }
    if (window.currentTrack) {
      window.currentTrack.remove();
    }

    const blob = new Blob([vttText], { type: 'text/vtt' });
    const vttBlobUrl = URL.createObjectURL(blob);
    window.VTTManager.setVttBlobUrl(vttBlobUrl);

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'العربية';
    track.srclang = 'ar';
    track.default = false; // تعطيل العرض التلقائي
    track.src = vttBlobUrl;
    
    const player = document.getElementById('player');
    player.appendChild(track);
    window.currentTrack = track;

    // تطبيق القالب المختار
    if (window.TemplateManager && window.TemplateManager.getSelectedTemplate()) {
      window.TemplateManager.applyTemplateStyles(window.TemplateManager.getSelectedTemplate());
    }

    // إنشاء نظام الكابشن المحسن
    if (window.CaptionSystem) {
      window.CaptionSystem.loadCaptionPosition();
      window.CaptionSystem.createCaptionSystem();
    }

    if (typeof write === 'function') write('تم التحويل بنجاح! شغّل الفيديو لمشاهدة الترجمة.', 'success');
    setTimeout(() => {
      if (typeof showProgress === 'function') showProgress(false);
    }, 1200);

    // افتح تبويب "تحرير النصوص" تلقائيًا بعد النجاح
    if (window.UIManager) {
      window.UIManager.switchToEditorTab();
    }

  } catch (e) {
    clearInterval(iv);
    if (typeof showProgress === 'function') showProgress(false);
    if (typeof write === 'function') write('فشل الاتصال بالخادم: ' + e.message, 'error');
  }
}

// دالة اختيار الملف
function onFilePicked(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  attachLocalVideo(file);
  transcribe(file);
  
  // تحديث حالة زر تطبيق القالب
  if (window.TemplateManager) {
    const applyBtn = document.getElementById('applyTemplateBtn');
    if (applyBtn) applyBtn.disabled = !window.TemplateManager.getSelectedTemplate();
  }
}

// إعداد مستمعي الأحداث لمشغل الفيديو
function setupVideoPlayerEventListeners() {
  const fileInput = document.getElementById('file');
  const fileInput2 = document.getElementById('file2');
  const playPause = document.getElementById('playPause');
  const fitBtn = document.getElementById('fit');
  const muteBtn = document.getElementById('mute');
  const exportBtn = document.getElementById('exportBtn');
  const stage = document.getElementById('stage');

  // أحداث اختيار الملف
  if (fileInput) fileInput.addEventListener('change', onFilePicked);
  if (fileInput2) fileInput2.addEventListener('change', onFilePicked);

  // تشغيل/إيقاف
  if (playPause) {
    playPause.addEventListener('click', () => {
      const player = document.getElementById('player');
      if (player.paused) {
        player.play();
        playPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        player.pause();
        playPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    });
  }

  // ملاءمة للشاشة
  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      const videoWrapEl = document.getElementById('videoWrap');
      if (!videoWrapEl) return;
      videoWrapEl.classList.toggle('small');
      if (typeof write === 'function') {
        write(videoWrapEl.classList.contains('small') ? 'تم تصغير الفيديو.' : 'تم تكبير الفيديو.', 'success');
      }
    });
  }

  // كتم الصوت
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const player = document.getElementById('player');
      player.muted = !player.muted;
      muteBtn.innerHTML = player.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    });
  }

  // تصدير ملف الترجمة
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const vttBlobUrl = window.VTTManager ? window.VTTManager.getVttBlobUrl() : null;
      if (!vttBlobUrl) {
        if (typeof write === 'function') write('لا يوجد ملف ترجمة للتصدير.', 'error');
        return;
      }
      const a = document.createElement('a');
      a.href = vttBlobUrl;
      a.download = 'subtitles.vtt';
      a.click();
      if (typeof write === 'function') write('تم تنزيل ملف الترجمة.', 'success');
    });
  }

  // سحب وإفلات فوق اللوحة الوسطى
  if (stage) {
    ['dragenter', 'dragover'].forEach(evt => {
      stage.addEventListener(evt, e => {
        e.preventDefault();
        stage.style.outline = '2px dashed #3b82f6';
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      stage.addEventListener(evt, e => {
        e.preventDefault();
        stage.style.outline = 'none';
      });
    });

    stage.addEventListener('drop', e => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('video/')) {
        attachLocalVideo(file);
        transcribe(file);
      } else {
        if (typeof write === 'function') write('رجاءً أفلت ملف فيديو صالح.', 'error');
      }
    });
  }
}

// دالة مساعدة لتنسيق حجم الملف
function formatSize(bytes) {
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + units[i];
}

// تصدير الدوال للاستخدام في الملفات الأخرى
window.VideoPlayer = {
  attachLocalVideo,
  transcribe,
  onFilePicked,
  setupVideoPlayerEventListeners,
  formatSize
};
