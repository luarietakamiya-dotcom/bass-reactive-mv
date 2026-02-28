/* ========================================
   Recording — WebM + ffmpeg.wasm → MP4
   ======================================== */
import { state } from '../core/state.js';

let ffmpegInstance = null;
let ffmpegLoading = false;

export function startRecording(canvas, onStatusUpdate, bitrate = 2_000_000) {
    const stream = canvas.captureStream(60);
    if (state.audioContext && state.audioContext.state === 'running') {
        const dest = state.audioContext.createMediaStreamDestination();
        state.gainNode.connect(dest);
        for (const track of dest.stream.getAudioTracks()) {
            stream.addTrack(track);
        }
    }

    const options = { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: bitrate };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
        options.videoBitsPerSecond = bitrate;
    }

    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, options);
    state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.recordedChunks.push(e.data);
    };
    state.mediaRecorder.start(100);
    state.isRecording = true;
    if (onStatusUpdate) onStatusUpdate('recording');
}

export function stopRecording(onStatusUpdate) {
    return new Promise((resolve) => {
        if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') {
            state.isRecording = false;
            resolve(null);
            return;
        }
        state.mediaRecorder.onstop = async () => {
            state.isRecording = false;
            const webmBlob = new Blob(state.recordedChunks, { type: 'video/webm' });
            if (onStatusUpdate) onStatusUpdate('converting');

            try {
                const mp4Blob = await convertToMP4(webmBlob);
                downloadBlob(mp4Blob, `bass-mv-${Date.now()}.mp4`);
            } catch (e) {
                console.warn('MP4 conversion failed, downloading WebM', e);
                downloadBlob(webmBlob, `bass-mv-${Date.now()}.webm`);
            }
            if (onStatusUpdate) onStatusUpdate('done');
            resolve();
        };
        state.mediaRecorder.stop();
    });
}

async function convertToMP4(webmBlob) {
    if (!ffmpegInstance) {
        if (ffmpegLoading) throw new Error('ffmpeg already loading');
        ffmpegLoading = true;
        const { FFmpeg } = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10');
        const { toBlobURL } = await import('https://esm.sh/@ffmpeg/util@0.12.1');
        ffmpegInstance = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        ffmpegLoading = false;
    }
    const ffmpeg = ffmpegInstance;
    const data = new Uint8Array(await webmBlob.arrayBuffer());
    await ffmpeg.writeFile('input.webm', data);
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', 'output.mp4']);
    const result = await ffmpeg.readFile('output.mp4');
    return new Blob([result.buffer], { type: 'video/mp4' });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
