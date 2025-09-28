// إدارة ملفات VTT والترجمة
// VTT File Management

// متغيرات VTT
let vttBlobUrl = null;
let vttCues = [];
let currentCueIndex = -1;

// دالة تحليل ملف VTT
function parseVTTFile() {
  if (!window.currentTrack || !vttBlobUrl) return;

  fetch(vttBlobUrl)
    .then(response => response.text())
    .then(vttText => {
      vttCues = parseVTTText(vttText);
      window.vttCues = vttCues; // تحديث النطاق العام
      setupCaptionSync();
      if (window.TranscriptEditor) {
        window.TranscriptEditor.renderTranscriptList(); // بناء قائمة الجُمل في تبويب التحرير
      }
      if (typeof write === 'function') write(`تم تحليل ${vttCues.length} نص ترجمة`, 'success');
    })
    .catch(error => {
      console.error('خطأ في تحليل ملف VTT:', error);
      if (typeof write === 'function') write('خطأ في تحليل ملف الترجمة', 'error');
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

// دالة حفظ تعديل النص
function saveCueText(idx, newText) {
  if (idx >= 0 && idx < vttCues.length) {
    vttCues[idx].text = newText.trim();
    window.vttCues = vttCues; // تحديث النطاق العام
    
    // تحديث النص في الكابشن فوراً
    if (window.CaptionSystem && window.CaptionSystem.getCaptionBox()) {
      const captionBox = window.CaptionSystem.getCaptionBox();
      captionBox.textContent = newText.trim();
      const captionContainer = window.CaptionSystem.getCaptionContainer();
      if (captionContainer) captionContainer.style.display = 'block';
      window.currentCaptionText = newText.trim(); // تحديث المتغير للمقارنة
      
      // تطبيق القالب المختار إذا كان موجوداً
      const selectedTemplate = window.TemplateManager?.getSelectedTemplate();
      if (selectedTemplate && newText.trim()) {
        if (selectedTemplate.id === 'sticker-captions' && selectedTemplate.stickerMode?.enabled) {
          // قالب الملصقات الملونة
          if (window.TemplateManager?.applyStickerTemplate) {
            const vttData = {
              start: vttCues[idx].start,
              end: vttCues[idx].end,
              text: newText.trim()
            };
            window.TemplateManager.applyStickerTemplate(captionBox, selectedTemplate, vttData);
          }
        } else if ((selectedTemplate.id === 'word-highlight' || selectedTemplate.id === 'yellow-sync-highlight') && selectedTemplate.wordHighlight?.enabled) {
          // قالب الهايلايت كلمة بكلمة
          const vttData = {
            start: vttCues[idx].start,
            end: vttCues[idx].end,
            text: newText.trim()
          };
          if (window.TemplateManager?.startWordHighlight) {
            window.TemplateManager.startWordHighlight(captionBox, selectedTemplate, vttData);
          }
        } else {
          // قوالب أخرى
          if (window.TemplateManager?.applyTemplateStyles) {
            window.TemplateManager.applyTemplateStyles(selectedTemplate);
          }
        }
      }
    }
    
    // تحديث ملف VTT
    updateVTTFile();
    
    // تحديث العنصر في القائمة
    if (window.TranscriptEditor) {
      const cueListEl = document.getElementById('cueList');
      if (cueListEl) {
        const item = cueListEl.querySelector(`.cue-item[data-idx="${idx}"]`);
        if (item) {
          const txt = item.querySelector('.cue-text');
          if (txt) txt.setAttribute('data-original', newText.trim());
        }
      }
    }
    
    if (typeof write === 'function') write(`تم حفظ تعديل الجملة ${idx + 1}`, 'success');
  }
}

// دالة حذف الجملة
function deleteCue(idx) {
  if (idx >= 0 && idx < vttCues.length) {
    if (confirm(`هل تريد حذف الجملة "${vttCues[idx].text.substring(0, 50)}..."؟`)) {
      vttCues.splice(idx, 1);
      window.vttCues = vttCues; // تحديث النطاق العام
      
      // تحديث الفهرس الحالي
      if (currentCueIndex >= idx) {
        currentCueIndex = Math.max(0, currentCueIndex - 1);
        window.currentCueIndex = currentCueIndex; // تحديث النطاق العام
      }
      
      // تحديث currentCueIndex في النطاق العام
      updateCurrentCueIndex(currentCueIndex);
      
      // إعادة بناء القائمة
      if (window.TranscriptEditor) {
        window.TranscriptEditor.renderTranscriptList();
      }
      
      // تحديث ملف VTT
      updateVTTFile();
      
      // فرض تحديث الكابشن
      setTimeout(() => {
        if (window.CaptionSystem) {
          window.CaptionSystem.forceUpdateCaption();
        }
      }, 100);
      
      // تحديث النص الظاهر في الفيديو فوراً
      if (window.CaptionSystem && window.CaptionSystem.getCaptionBox()) {
        const captionBox = window.CaptionSystem.getCaptionBox();
        const captionContainer = window.CaptionSystem.getCaptionContainer();
        
        if (vttCues.length > 0) {
          if (currentCueIndex >= 0 && currentCueIndex < vttCues.length) {
            // إظهار النص الحالي
            captionBox.textContent = vttCues[currentCueIndex].text;
            if (captionContainer) captionContainer.style.display = 'block';
            window.currentCaptionText = vttCues[currentCueIndex].text; // تحديث المتغير
            
            // تطبيق القالب المختار إذا كان موجوداً
            const selectedTemplate = window.TemplateManager?.getSelectedTemplate();
            if (selectedTemplate && vttCues[currentCueIndex].text) {
              if (selectedTemplate.id === 'sticker-captions' && selectedTemplate.stickerMode?.enabled) {
                // قالب الملصقات الملونة
                if (window.TemplateManager?.applyStickerTemplate) {
                  const vttData = {
                    start: vttCues[currentCueIndex].start,
                    end: vttCues[currentCueIndex].end,
                    text: vttCues[currentCueIndex].text
                  };
                  window.TemplateManager.applyStickerTemplate(captionBox, selectedTemplate, vttData);
                }
              } else if ((selectedTemplate.id === 'word-highlight' || selectedTemplate.id === 'yellow-sync-highlight') && selectedTemplate.wordHighlight?.enabled) {
                // قالب الهايلايت كلمة بكلمة
                const vttData = {
                  start: vttCues[currentCueIndex].start,
                  end: vttCues[currentCueIndex].end,
                  text: vttCues[currentCueIndex].text
                };
                if (window.TemplateManager?.startWordHighlight) {
                  window.TemplateManager.startWordHighlight(captionBox, selectedTemplate, vttData);
                }
              } else {
                // قوالب أخرى
                if (window.TemplateManager?.applyTemplateStyles) {
                  window.TemplateManager.applyTemplateStyles(selectedTemplate);
                }
              }
            }
          } else {
            // إخفاء الكابشن إذا لم تعد هناك جمل
            if (captionContainer) captionContainer.style.display = 'none';
            window.currentCaptionText = ''; // إعادة تعيين المتغير
          }
        } else {
          // إخفاء الكابشن إذا لم تعد هناك جمل
          if (captionContainer) captionContainer.style.display = 'none';
          window.currentCaptionText = ''; // إعادة تعيين المتغير
        }
      }
      
      if (typeof write === 'function') write(`تم حذف الجملة ${idx + 1}`, 'success');
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
  if (window.currentTrack) {
    window.currentTrack.src = vttBlobUrl;
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
  const player = document.getElementById('player');
  if (!player) {
    if (typeof write === 'function') write('يرجى رفع فيديو أولاً', 'error');
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
  window.vttCues = vttCues; // تحديث النطاق العام
  
  // إعادة بناء القائمة
  if (window.TranscriptEditor) {
    window.TranscriptEditor.renderTranscriptList();
  }
  
  // تحديث ملف VTT
  updateVTTFile();
  
  // تحديد الجملة الجديدة
  if (window.TranscriptEditor) {
    window.TranscriptEditor.selectCue(insertIndex, false);
  }
  
  // إظهار النص في الفيديو فوراً
  if (window.CaptionSystem && window.CaptionSystem.getCaptionBox()) {
    const captionBox = window.CaptionSystem.getCaptionBox();
    const captionContainer = window.CaptionSystem.getCaptionContainer();
    captionBox.textContent = newCue.text;
    if (captionContainer) captionContainer.style.display = 'block';
    window.currentCaptionText = newCue.text; // تحديث المتغير للمقارنة
  }
  
  // التركيز على النص للتحرير
  setTimeout(() => {
    const cueListEl = document.getElementById('cueList');
    if (cueListEl) {
      const item = cueListEl.querySelector(`.cue-item[data-idx="${insertIndex}"]`);
      if (item) {
        const txt = item.querySelector('.cue-text');
        if (txt) {
          txt.focus();
          txt.select();
        }
      }
    }
  }, 100);

  if (typeof write === 'function') write(`تم إضافة جملة جديدة في الوقت ${s2ts(currentTime)}`, 'success');
}

// إعداد مزامنة الكابشن
function setupCaptionSync() {
  const player = document.getElementById('player');
  if (!player || !vttCues.length) return;
  player.addEventListener('timeupdate', updateCaption);
  player.addEventListener('seeked', updateCaption);
}

// دالة مساعدة لتحويل الثواني إلى توقيت
function s2ts(s) { // seconds to timestamp mm:ss.mmm
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = (s%60).toFixed(3).padStart(6,'0');
  return (h? String(h).padStart(2,'0')+':':'') + String(m).padStart(2,'0') + ':' + sec;
}

// تصدير الدوال للاستخدام في الملفات الأخرى
window.VTTManager = {
  parseVTTFile,
  parseVTTText,
  timeToSeconds,
  saveCueText,
  deleteCue,
  updateVTTFile,
  secondsToTime,
  addNewCue,
  setupCaptionSync,
  s2ts,
  getVttCues: () => vttCues,
  setVttCues: (cues) => { vttCues = cues; },
  getCurrentCueIndex: () => currentCueIndex,
  setCurrentCueIndex: (idx) => { currentCueIndex = idx; },
  updateCurrentCueIndex,
  getVttBlobUrl: () => vttBlobUrl,
  setVttBlobUrl: (url) => { vttBlobUrl = url; }
};

// جعل المتغيرات متاحة في النطاق العام
window.vttCues = vttCues;
window.currentCueIndex = currentCueIndex;

// دالة تحديث currentCueIndex
function updateCurrentCueIndex(idx) {
  currentCueIndex = idx;
  window.currentCueIndex = currentCueIndex;
}
