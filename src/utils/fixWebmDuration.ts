/**
 * EBML Duration Patcher для WebM файлов от MediaRecorder.
 * Внедряет точные метаданные длительности (Duration 0x4489) в заголовок Segment Info (0x1549A966),
 * благодаря чему галереи, мессенджеры и плееры (Google Photos, Samsung Gallery, Apple Files, Telegram, WhatsApp)
 * гарантированно и корректно отображают общую длину и таймлайн перемотки.
 */

function readVint(
  u8: Uint8Array,
  offset: number
): { val: number; len: number; isUnknown: boolean } | null {
  if (offset >= u8.length) return null;
  const first = u8[offset];
  let len = 1;
  let mask = 0x80;
  while (len <= 8 && (first & mask) === 0) {
    len++;
    mask >>= 1;
  }
  if (len > 8) return null;
  let val = first & (mask - 1);
  for (let i = 1; i < len; i++) {
    val = (val * 256) + u8[offset + i];
  }
  const isUnknown =
    first === 0x01 && len === 8 && Array.from(u8.subarray(offset + 1, offset + 8)).every((b) => b === 0xff);
  return { val, len, isUnknown };
}

function encodeVint(val: number, minLen = 1): Uint8Array {
  let len = minLen;
  if (val >= 0x7f && len === 1) len = 2;
  if (val >= 0x3fff && len === 2) len = 3;
  if (val >= 0x1fffff && len === 3) len = 4;

  const buf = new Uint8Array(len);
  let temp = val;
  for (let i = len - 1; i > 0; i--) {
    buf[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  buf[0] = (1 << (8 - len)) | (temp & ((1 << (8 - len)) - 1));
  return buf;
}

/**
 * Быстрый и безопасный патчер длительности для WebM blob.
 * @param rawBlob Исходный WebM Blob от MediaRecorder
 * @param targetDurationSec Длительность в секундах (например, 14.5)
 */
export async function safeFixWebm(
  rawBlob: Blob,
  targetDurationSec?: number
): Promise<Blob> {
  if (!rawBlob || rawBlob.size < 40 || !targetDurationSec || targetDurationSec <= 0) {
    return rawBlob;
  }

  try {
    const arrayBuffer = await rawBlob.arrayBuffer();
    const u8 = new Uint8Array(arrayBuffer);
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    // 1. Проверяем заголовок EBML (0x1A45DFA3)
    if (view.getUint32(0) !== 0x1a45dfa3) {
      return rawBlob;
    }
    const ebmlLen = readVint(u8, 4);
    if (!ebmlLen) return rawBlob;

    // 2. Ищем контейнер Segment (0x18538067)
    const segOffset = 4 + ebmlLen.len + ebmlLen.val;
    if (segOffset + 4 >= u8.length || view.getUint32(segOffset) !== 0x18538067) {
      return rawBlob;
    }

    const segLenPos = segOffset + 4;
    const segLen = readVint(u8, segLenPos);
    if (!segLen) return rawBlob;

    const segHeaderEnd = segLenPos + segLen.len;
    let pos = segHeaderEnd;
    let infoPos = -1;
    let infoLen: { val: number; len: number; isUnknown: boolean } | null = null;

    // 3. Ищем Segment Info (0x1549A966)
    const searchLimit = Math.min(u8.length - 8, segHeaderEnd + 8192);
    while (pos < searchLimit) {
      if (view.getUint32(pos) === 0x1549a966) {
        infoPos = pos;
        infoLen = readVint(u8, pos + 4);
        break;
      }
      pos++;
    }

    if (infoPos === -1 || !infoLen) {
      return rawBlob;
    }

    const infoLenPos = infoPos + 4;
    const infoDataStart = infoLenPos + infoLen.len;
    const infoDataEnd = infoDataStart + infoLen.val;

    // 4. Считываем TimecodeScale (0x2AD7B1), по умолчанию 1 000 000 нс = 1 мс
    let timecodeScaleNs = 1_000_000;
    let durOffset = -1;
    let durLen = 0;
    let p = infoDataStart;

    while (p < infoDataEnd) {
      if (p + 3 <= infoDataEnd && u8[p] === 0x2a && u8[p + 1] === 0xd7 && u8[p + 2] === 0xb1) {
        const tcLen = readVint(u8, p + 3);
        if (tcLen) {
          let tcVal = 0;
          for (let i = 0; i < tcLen.val; i++) {
            tcVal = (tcVal * 256) + u8[p + 3 + tcLen.len + i];
          }
          timecodeScaleNs = tcVal || 1_000_000;
          p = p + 3 + tcLen.len + tcLen.val;
          continue;
        }
      }
      // Duration ID: 0x4489
      if (p + 2 <= infoDataEnd && u8[p] === 0x44 && u8[p + 1] === 0x89) {
        const dLen = readVint(u8, p + 2);
        if (dLen) {
          durOffset = p;
          durLen = 2 + dLen.len + dLen.val;
          break;
        }
      }
      p++;
    }

    // Длительность в единицах TimecodeScale
    const durationInScaleUnits = (targetDurationSec * 1e9) / timecodeScaleNs;

    // Вариант А: Тег Duration уже был — обновляем значение на месте
    if (durOffset !== -1) {
      const dVint = readVint(u8, durOffset + 2);
      if (dVint) {
        const dValOffset = durOffset + 2 + dVint.len;
        const dValLen = durLen - (dValOffset - durOffset);
        if (dValLen === 4) {
          view.setFloat32(dValOffset, durationInScaleUnits, false);
          return new Blob([u8], { type: rawBlob.type || 'video/webm' });
        } else if (dValLen === 8) {
          view.setFloat64(dValOffset, durationInScaleUnits, false);
          return new Blob([u8], { type: rawBlob.type || 'video/webm' });
        }
      }
    }

    // Вариант Б: Тег Duration отсутствовал — внедряем 11-байтовый элемент Duration (0x4489)
    const durElem = new Uint8Array(11);
    durElem[0] = 0x44;
    durElem[1] = 0x89;
    durElem[2] = 0x88; // VINT length = 8 байт
    const durView = new DataView(durElem.buffer);
    durView.setFloat64(3, durationInScaleUnits, false); // IEEE 754 Float64 (Big-Endian)

    const newInfoVal = infoLen.val + 11;
    const newInfoVint = encodeVint(newInfoVal, infoLen.len);
    const vintDiff = newInfoVint.length - infoLen.len;

    const out = new Uint8Array(u8.length + 11 + vintDiff);
    out.set(u8.subarray(0, infoLenPos), 0);
    out.set(newInfoVint, infoLenPos);
    const newInfoDataStart = infoLenPos + newInfoVint.length;
    out.set(u8.subarray(infoDataStart, infoDataEnd), newInfoDataStart);
    out.set(durElem, newInfoDataStart + infoLen.val);
    out.set(u8.subarray(infoDataEnd), newInfoDataStart + infoLen.val + 11);

    if (!segLen.isUnknown) {
      const newSegVal = segLen.val + 11 + vintDiff;
      const newSegVint = encodeVint(newSegVal, segLen.len);
      if (newSegVint.length === segLen.len) {
        out.set(newSegVint, segLenPos);
      }
    }

    return new Blob([out], { type: rawBlob.type || 'video/webm' });
  } catch (err) {
    console.warn('safeFixWebm error:', err);
    return rawBlob;
  }
}

/**
 * Совместимая обёртка для вызова с миллисекундами (durationMs)
 */
export async function patchWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  return safeFixWebm(blob, durationMs / 1000);
}
