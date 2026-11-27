// The teacher's WhatsApp chat was configured in Clara prettier's retelling.
const teacherChat = 'https://wa.me/13802788926';
for (const box of document.querySelectorAll('[data-advent-recording]')) setupRecorder(box);

function setupRecorder(box) {
  box.innerHTML = `
    <div class="ex-actions">
      <button class="btn" type="button" data-record>Record your answer</button>
      <button class="btn" type="button" data-stop hidden>Stop recording</button>
    </div>
    <p data-record-status role="status"></p>
    <div data-record-result hidden>
      <audio controls preload="none" aria-label="Play recording"></audio>
      <div class="ex-actions">
        <button class="btn" type="button" data-record-again>Record again</button>
        <a class="btn" data-record-download download>Download</a>
        <button class="btn" type="button" data-record-share>Send via WhatsApp</button>
      </div>
    </div>`;
  const get = (selector) => box.querySelector(selector);
  const record = get('[data-record]');
  const stop = get('[data-stop]');
  const status = get('[data-record-status]');
  const result = get('[data-record-result]');
  const download = get('[data-record-download]');
  const share = get('[data-record-share]');
  const player = get('audio');
  let stream;
  let file;
  let url;

  let useFallback = false;
  const release = () => { delete box.dataset.recordingPending; };
  const stopTracks = () => { stream?.getTracks().forEach((track) => track.stop()); stream = undefined; };
  const idle = () => {
    delete box.dataset.recordingActive;
    stopTracks();
    stop.hidden = true;
    result.hidden = !file;
    record.hidden = !!file;
    record.disabled = false;
  };
  function fallback() {
    // Open the chat while the click still has browser activation.
    let opened = false;
    try {
      const tab = window.open('about:blank', '_blank');
      if (tab) {
        tab.opener = null;
        tab.location.replace(teacherChat);
        opened = true;
      }
    } catch { /* Browser policy prevented opening the chat. */ }
    download.click();
    status.textContent = opened
      ? 'Attach your recording in WhatsApp and send it to your teacher.'
      : 'The browser blocked the WhatsApp tab. Allow pop-ups for this site and tap Send via WhatsApp again.';
  }
  const shareData = () => ({ files: [file] });
  const canShareFile = () => {
    try { return !!(navigator.share && navigator.canShare?.(shareData())); }
    catch { return false; }
  };

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    record.disabled = true;
    status.textContent = 'Recording is unavailable here. Use your device’s recorder, then attach the file in WhatsApp.';
    return;
  }

  async function startRecording() {
    if (record.disabled) return;
    record.disabled = true;
    box.dataset.recordingActive = '';
    status.textContent = 'Waiting for microphone access…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const format = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm']
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = format ? new MediaRecorder(stream, { mimeType: format }) : new MediaRecorder(stream);
      const chunks = [];
      let failed = false;
      stop.onclick = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        stop.disabled = true;
        status.textContent = 'Preparing recording…';
      };
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => {
        failed = true;
        idle();
        status.textContent = 'Recording stopped unexpectedly. Try recording again.';
      };
      recorder.onstop = () => {
        if (failed) return;
        if (!chunks.length) {
          idle();
          status.textContent = 'The recording was empty. Try again.';
          return;
        }
        const mime = chunks[0].type || recorder.mimeType || format || '';
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('webm') ? 'webm' : 'audio';
        file = new File(chunks, 'advent-recording.' + ext, { type: mime });
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(file);
        player.src = download.href = url;
        download.download = file.name;
        box.dataset.recordingPending = '';
        idle();
        result.hidden = false;
        status.textContent = 'Recording ready. Play, download or share it.';
      };
      recorder.start();
      record.hidden = true;
      result.hidden = true;
      stop.hidden = false;
      stop.disabled = false;
      status.textContent = 'Recording…';
    } catch (error) {
      idle();
      status.textContent = error.name === 'NotAllowedError'
        ? 'Microphone access was declined. Allow it in your browser settings and try again.'
        : error.name === 'NotFoundError'
          ? 'No microphone was found. Connect a microphone and try again.'
          : 'Could not start recording. Check your microphone and try again.';
    }
  }

  record.addEventListener('click', startRecording);
  get('[data-record-again]').addEventListener('click', () => {
    if (!box.hasAttribute('data-recording-pending')) { startRecording(); return; }
    const dialog = document.createElement('dialog');
    dialog.className = 'advent-recording-dialog';
    dialog.setAttribute('aria-label', 'Replace your recording?');
    dialog.innerHTML = `<p>Your recording hasn’t been saved. Replace it?</p>
      <form method="dialog" class="ex-actions">
        <button class="btn" value="keep" autofocus>Keep recording</button>
        <button class="btn" value="replace">Record again</button>
      </form>`;
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (dialog.returnValue === 'replace') startRecording();
    });
    document.body.append(dialog);
    dialog.showModal();
  });

  download.addEventListener('click', release);
  share.addEventListener('click', async () => {
    if (!file || share.disabled) return;
    if (useFallback || !canShareFile()) { fallback(); return; }
    share.disabled = true;
    try {
      await navigator.share(shareData());
      release();
      status.textContent = 'Finish sending in WhatsApp. Check the teacher’s chat to confirm it arrived.';
    } catch (error) {
      if (error.name === 'AbortError') {
        status.textContent = 'Sharing was cancelled. Your recording is still here.';
      } else {
        useFallback = true;
        if (navigator.userActivation?.isActive) fallback();
        else status.textContent = 'File sharing is unavailable. Tap Send via WhatsApp again to download the recording and open the chat.';
      }
    } finally {
      share.disabled = false;
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (box.matches('[data-recording-pending], [data-recording-active]')) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    stopTracks();
    if (url) URL.revokeObjectURL(url);
  });
}

// Standalone links use the same leave policy as the embedded lesson.
if (window.top === window) {
  let confirmation;
  function guard(event, navigate) {
    const active = document.querySelector('[data-recording-active]');
    if (active) {
      event.preventDefault();
      active.querySelector('[data-record-status]').textContent = 'Stop recording before leaving this section.';
      active.querySelector('[data-stop]:not([hidden])')?.focus();
      return;
    }
    if (!document.querySelector('[data-recording-pending]')) return;
    if (!window.HTMLDialogElement?.prototype.showModal) return; // Native beforeunload is the fallback.
    event.preventDefault();
    if (confirmation) return;
    const dialog = document.createElement('dialog');
    confirmation = dialog;
    dialog.className = 'advent-recording-dialog';
    dialog.setAttribute('aria-labelledby', 'advent-recording-warning');
    dialog.innerHTML = `
      <p id="advent-recording-warning">Your recording hasn’t been saved. Leave this page anyway?</p>
      <form method="dialog" class="ex-actions">
        <button class="btn" value="stay" autofocus>Stay on page</button>
        <button class="btn" value="continue">Continue</button>
      </form>`;
    dialog.addEventListener('close', () => {
      confirmation = undefined;
      dialog.remove();
      if (dialog.returnValue !== 'continue') return;
      for (const box of document.querySelectorAll('[data-recording-pending]')) delete box.dataset.recordingPending;
      navigate();
    });
    document.body.append(dialog);
    dialog.showModal();
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')
      || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = new URL(link.href);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return;
    if (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search) return;
    guard(event, () => { location.href = link.href; });
  });
  document.addEventListener('advent-story-navigate', (event) => {
    guard(event, () => { location.href = event.detail; });
  });
}
