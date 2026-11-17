import { useCallback, useEffect, useRef, useState } from 'react';
import { useCompleteUpload, useRequestUploadUrl } from '@workspace/api-client-react';

export type AssetField = 'avatarPath' | 'backgroundPath' | 'audioPath' | 'audioPath2' | 'audioPath3' | 'audioPath4' | 'audioCoverPath';
export type UploadPhase = 'idle' | 'signing' | 'sending' | 'confirming' | 'done' | 'error';
export type UploadState = { phase: UploadPhase; progress: number; fileName?: string; message?: string };

const MiB = 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/hevc', 'video/x-m4v'];
const audioTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm'];
const extensionTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', hevc: 'video/hevc', m4v: 'video/x-m4v',
  mp3: 'audio/mpeg', m4a: 'audio/mp4',
  aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav',
};

/** Some file pickers report empty/generic MIME for otherwise supported files. */
function assetContentType(field: AssetField, file: File): string {
  const reported = file.type.toLowerCase();
  const aliases: Record<string, string> = {
    'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/vnd.wave': 'audio/wav',
    'audio/mp3': 'audio/mpeg', 'image/jpg': 'image/jpeg',
  };
  if (aliases[reported]) return aliases[reported];
  if (reported && !['application/octet-stream', 'binary/octet-stream'].includes(reported)) return reported;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (field.startsWith('audioPath') && ['mp4', 'webm'].includes(extension)) return `audio/${extension}`;
  return extensionTypes[extension] ?? reported;
}

export const assetAccept: Record<AssetField, string> = {
  avatarPath: imageTypes.join(','),
  audioCoverPath: imageTypes.join(','),
  backgroundPath: [...imageTypes, ...videoTypes, '.mov', '.hevc', '.m4v'].join(','),
  audioPath: audioTypes.join(','),
  audioPath2: audioTypes.join(','),
  audioPath3: audioTypes.join(','),
  audioPath4: audioTypes.join(','),
};

export const assetHint: Record<AssetField, string> = {
  avatarPath: 'JPEG, PNG (โปร่งใสได้), WebP · ไม่เกิน 10 MB',
  audioCoverPath: 'JPEG, PNG, WebP · ไม่เกิน 10 MB',
  backgroundPath: 'ภาพ JPEG/PNG/WebP ≤ 5 MB · วิดีโอ MP4/WebM/MOV (รวม HEVC) ≤ 10 MB · แปลงเป็น MP4',
  audioPath: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath2: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath3: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath4: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
};

export function validateAsset(field: AssetField, file: File): string | null {
  const t = assetContentType(field, file);
  if (field.startsWith('audioPath')) {
    if (!audioTypes.includes(t)) return 'ไฟล์เสียงประเภทนี้ยังไม่รองรับ';
    if (file.size > 10 * MiB) return 'ไฟล์เสียงใหญ่เกิน 10 MB';
    return null;
  }
  if (field === 'backgroundPath' && videoTypes.includes(t)) return file.size > 10 * MiB ? 'วิดีโอใหญ่เกิน 10 MB' : null;
  if (!imageTypes.includes(t)) return field === 'backgroundPath' ? 'รองรับภาพ JPEG/PNG/WebP หรือวิดีโอ MP4/WebM/MOV (รวม HEVC)' : 'รองรับเฉพาะ JPEG, PNG และ WebP';
  const maxImageSize = field === 'backgroundPath' ? 5 : 10;
  if (file.size > maxImageSize * MiB) return `ภาพใหญ่เกิน ${maxImageSize} MB`;
  return null;
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void, register: (x: XMLHttpRequest) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    register(xhr);
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.onabort = () => reject(new Error('aborted'));
    xhr.send(file);
  });
}

const idle: UploadState = { phase: 'idle', progress: 0 };
const fields: AssetField[] = ['avatarPath', 'backgroundPath', 'audioPath', 'audioPath2', 'audioPath3', 'audioPath4', 'audioCoverPath'];

/** Uploads only produce an object path; persistence happens on explicit Save. */
export function useAssetUploads(onUploaded: (field: AssetField, objectPath: string, file: File) => void) {
  const requestUrl = useRequestUploadUrl();
  const complete = useCompleteUpload();
  const requestRef = useRef(requestUrl.mutateAsync);
  requestRef.current = requestUrl.mutateAsync;
  const completeRef = useRef(complete.mutateAsync);
  completeRef.current = complete.mutateAsync;
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;
  const seq = useRef<Record<AssetField, number>>({ avatarPath: 0, backgroundPath: 0, audioPath: 0, audioPath2: 0, audioPath3: 0, audioPath4: 0, audioCoverPath: 0 });
  const xhrs = useRef<Partial<Record<AssetField, XMLHttpRequest>>>({});
  const [states, setStates] = useState<Record<AssetField, UploadState>>({ avatarPath: idle, backgroundPath: idle, audioPath: idle, audioPath2: idle, audioPath3: idle, audioPath4: idle, audioCoverPath: idle });
  useEffect(() => () => {
    for (const field of fields) {
      seq.current[field]++;
      xhrs.current[field]?.abort();
    }
  }, []);

  const patch = (field: AssetField, s: UploadState) => setStates(old => ({ ...old, [field]: s }));

  const start = useCallback(async (field: AssetField, originalFile: File) => {
    const contentType = assetContentType(field, originalFile);
    const file = contentType === originalFile.type ? originalFile : new File([originalFile], originalFile.name, {
      type: contentType, lastModified: originalFile.lastModified,
    });
    const invalid = validateAsset(field, file);
    if (invalid) { patch(field, { phase: 'error', progress: 0, fileName: file.name, message: invalid }); return; }
    xhrs.current[field]?.abort();
    const id = ++seq.current[field];
    const live = () => seq.current[field] === id;
    patch(field, { phase: 'signing', progress: 0, fileName: file.name });
    try {
      const signed = await requestRef.current({ data: { name: file.name, size: file.size, contentType: file.type || 'application/octet-stream', assetField: field } });
      if (!live()) return;
      patch(field, { phase: 'sending', progress: 0, fileName: file.name });
      await putWithProgress(signed.uploadURL, file, pct => { if (live()) patch(field, { phase: 'sending', progress: pct, fileName: file.name }); }, x => { xhrs.current[field] = x; });
      if (!live()) return;
      patch(field, { phase: 'confirming', progress: 100, fileName: file.name });
      const done = await completeRef.current({ data: { objectPath: signed.objectPath } });
      if (!live()) return;
      onUploadedRef.current(field, done.objectPath, file);
      patch(field, { phase: 'done', progress: 100, fileName: file.name });
    } catch {
      if (live()) patch(field, {
        phase: 'error',
        progress: 0,
        fileName: file.name,
        message: field === 'backgroundPath' && file.type.startsWith('video/')
          ? 'อัปโหลดหรือแปลงวิดีโอไม่สำเร็จ ลองใช้ไฟล์ที่สั้นลงหรือเล็กลง'
          : 'อัปโหลดไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
      });
    }
  }, []);

  const cancelAll = useCallback(() => {
    for (const f of fields) { seq.current[f]++; xhrs.current[f]?.abort(); }
    xhrs.current = {};
    setStates({ avatarPath: idle, backgroundPath: idle, audioPath: idle, audioPath2: idle, audioPath3: idle, audioPath4: idle, audioCoverPath: idle });
  }, []);

  const clear = useCallback((field: AssetField) => { seq.current[field]++; xhrs.current[field]?.abort(); patch(field, idle); }, []);

  const busy = fields.some(f => ['signing', 'sending', 'confirming'].includes(states[f].phase));
  return { states, start, cancelAll, clear, busy };
}
