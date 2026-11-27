// The teacher's WhatsApp chat was configured in Clara prettier's retelling.
const teacherChat = 'https://wa.me/13802788926';
for (const box of document.querySelectorAll('[data-advent-recording]')) setupRecorder(box);

function setupRecorder(box) {
  box.innerHTML = `
    <div class="ex-actions">
      <button class="btn" type="button" data-record>Record</button>
      <button class="btn" type="button" data-stop disabled>Stop</button>
    </div>
    <p data-record-status role="status"></p>
    <div data-record-result hidden>
      <audio controls preload="none" aria-label="Play recording"></audio>
      <div class="ex-actions">
        <a class="btn" data-record-download download>Download recording</a>
        <button class="btn" type="button" data-record-share>Send to teacher via WhatsApp</button>
        <a class="btn" href="${teacherChat}" target="_blank" rel="noopener" data-record-chat hidden>Open teacher’s WhatsApp chat</a>
        <button class="btn" type="button" data-record-keep>Continue without sharing</button>
      </div>
    </div>`;
  const get = (selector) => box.querySelector(selector);
  const record = get('[data-record]');
  const stop = get('[data-stop]');
  const status = get('[data-record-status]');
  const result = get('[data-record-result]');
  const download = get('[data-record-download]');
  const share = get('[data-record-share]');
  const chat = get('[data-record-chat]');
  const keep = get('[data-record-keep]');
  const player = get('audio');
  let stream;
  let file;
  let url;

  const protect = () => { box.dataset.recordingPending = ''; keep.hidden = true; };
  const release = () => { delete box.dataset.recordingPending; keep.hidden = true; };
  const stopTracks = () => { stream?.getTracks().forEach((track) => track.stop()); stream = undefined; };
  const fallback = () => {
    chat.hidden = false;
    status.textContent = 'Download the recording, open the teacher’s WhatsApp chat, then attach the file and send it there.';
  };
  const shareData = () => ({ files: [file] });
  const canShareFile = () => {
    try { return !!(navigator.share && navigator.canShare?.(shareData())); }
    catch { return false; }
  };

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    record.disabled = true;
    status.textContent = 'Recording is unavailable here. Use your device’s recorder, then attach the file in WhatsApp.';
    result.hidden = false;
    player.hidden = download.hidden = share.hidden = keep.hidden = true;
    chat.hidden = false;
    return;
  }

  record.addEventListener('click', async () => {
    if (file && box.hasAttribute('data-recording-pending')) {
      status.textContent = 'Download or share this recording before making a new one. You can also continue without sharing.';
      return;
    }
    record.disabled = true;
    const hadPending = box.hasAttribute('data-recording-pending');
    protect();
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
      };
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => {
        failed = true;
        stopTracks();
        record.disabled = false;
        stop.disabled = true;
        release();
        status.textContent = 'Recording stopped unexpectedly. Try recording again.';
      };
      recorder.onstop = () => {
        stopTracks();
        record.disabled = false;
        stop.disabled = true;
        if (failed) return;
        if (!chunks.length) {
          release();
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
        result.hidden = false;
        keep.hidden = false;
        chat.hidden = false;
        status.textContent = 'Recording ready. Play, download or share it.';
      };
      recorder.start();
      stop.disabled = false;
      status.textContent = 'Recording…';
    } catch (error) {
      stopTracks();
      record.disabled = false;
      if (!hadPending) release();
      status.textContent = error.name === 'NotAllowedError'
        ? 'Microphone access was declined. Allow it in your browser settings and try again.'
        : error.name === 'NotFoundError'
          ? 'No microphone was found. Connect a microphone and try again.'
          : 'Could not start recording. Check your microphone and try again.';
    }
  });

  download.addEventListener('click', release);
  keep.addEventListener('click', () => {
    release();
    status.textContent = 'You can continue. The recording remains available while this page is open.';
  });
  share.addEventListener('click', async () => {
    if (!file) return;
    if (!canShareFile()) { fallback(); return; }
    try {
      await navigator.share(shareData());
      release();
      status.textContent = 'Finish sending in WhatsApp. Check the teacher’s chat to confirm it arrived.';
    } catch (error) {
      if (error.name !== 'AbortError') fallback();
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (box.hasAttribute('data-recording-pending')) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => { stopTracks(); if (url) URL.revokeObjectURL(url); });
}
