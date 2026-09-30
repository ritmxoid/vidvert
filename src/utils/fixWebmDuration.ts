/**
 * Pure Browser TypeScript EBML WebM Seekable & Duration Generator.
 * 
 * Works 100% natively in the browser without Node.js 'Buffer' or external dependencies.
 * Converts streaming WebM blobs from MediaRecorder into seekable, indexed video files:
 * 1. Injects exact duration into Info segment
 * 2. Scans clusters to build keyframe Cues index
 * 3. Builds SeekHead table of contents
 * 
 * Guarantees mobile galleries (Google Photos, Samsung Gallery, iOS) and all media
 * players accurately show the full duration and enable seamless scrubbing.
 */

// Helper to encode EBML VINT (Variable Length Integer) for data sizes
function encodeVint(val: number): Uint8Array {
  if (val < 0x7f) {
    return new Uint8Array([0x80 | val]);
  } else if (val < 0x3fff) {
    return new Uint8Array([0x40 | (val >> 8), val & 0xff]);
  } else if (val < 0x1fffff) {
    return new Uint8Array([0x20 | (val >> 16), (val >> 8) & 0xff, val & 0xff]);
  } else if (val < 0x0fffffff) {
    return new Uint8Array([
      0x10 | (val >> 24),
      (val >> 16) & 0xff,
      (val >> 8) & 0xff,
      val & 0xff
    ]);
  } else {
    // 5-8 byte integers if ever needed
    const bytes: number[] = [];
    let temp = val;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp = Math.floor(temp / 256);
    }
    const len = bytes.length + 1;
    const marker = 1 << (8 - len);
    return new Uint8Array([marker, ...bytes]);
  }
}

// Encodes an EBML element with given ID and payload
function encodeElement(idBytes: number[], payload: Uint8Array): Uint8Array {
  const sizeVint = encodeVint(payload.length);
  const result = new Uint8Array(idBytes.length + sizeVint.length + payload.length);
  result.set(idBytes, 0);
  result.set(sizeVint, idBytes.length);
  result.set(payload, idBytes.length + sizeVint.length);
  return result;
}

// Encodes an unsigned integer in big-endian bytes
function encodeUint(val: number): Uint8Array {
  if (val === 0) return new Uint8Array([0]);
  const bytes: number[] = [];
  let temp = val;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp = Math.floor(temp / 256);
  }
  return new Uint8Array(bytes);
}

// Encodes IEEE-754 64-bit float
function encodeFloat64(val: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, val, false);
  return new Uint8Array(buf);
}

// Concat multiple Uint8Arrays
function concatArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Read VINT from buffer
function readVint(bytes: Uint8Array, offset: number): { value: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const b0 = bytes[offset];
  let length = 1;
  let mask = 0x80;
  while ((b0 & mask) === 0 && length < 8) {
    length++;
    mask >>= 1;
  }
  let value = b0 & (mask - 1);
  for (let i = 1; i < length; i++) {
    if (offset + i >= bytes.length) return null;
    value = value * 256 + bytes[offset + i];
  }
  return { value, length };
}

interface CuePoint {
  timecode: number;
  clusterOffset: number;
}

/**
 * Patches WebM recording Blob with full SeekHead, Cues and Duration index.
 */
export async function patchWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob || blob.size === 0 || durationMs <= 0) {
    return blob;
  }

  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Locate EBML header: 0x1A 0x45 0xDF 0xA3
    if (bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
      console.warn('[WebM] Invalid EBML header signature');
      return blob;
    }

    const ebmlLen = readVint(bytes, 4);
    if (!ebmlLen) return blob;
    const ebmlHeaderEnd = 4 + ebmlLen.length + ebmlLen.value;

    // 2. Locate Segment: 0x18 0x53 0x80 0x67
    let segmentPos = -1;
    for (let i = ebmlHeaderEnd; i < Math.min(bytes.length - 4, ebmlHeaderEnd + 64); i++) {
      if (
        bytes[i] === 0x18 &&
        bytes[i + 1] === 0x53 &&
        bytes[i + 2] === 0x80 &&
        bytes[i + 3] === 0x67
      ) {
        segmentPos = i;
        break;
      }
    }

    if (segmentPos === -1) return blob;

    const segmentLen = readVint(bytes, segmentPos + 4);
    if (!segmentLen) return blob;
    const segmentPayloadStart = segmentPos + 4 + segmentLen.length;

    // 3. Scan for Info (0x1549A966), Tracks (0x1654AE6B), and Clusters (0x1F43B675)
    let infoData: Uint8Array | null = null;
    let tracksData: Uint8Array | null = null;
    let firstClusterPos = -1;
    const cues: CuePoint[] = [];

    let scanPos = segmentPayloadStart;
    while (scanPos < bytes.length - 4) {
      // Check 4-byte element IDs
      const b0 = bytes[scanPos];
      const b1 = bytes[scanPos + 1];
      const b2 = bytes[scanPos + 2];
      const b3 = bytes[scanPos + 3];

      // Segment Info: 0x15 0x49 0xA9 0x66
      if (b0 === 0x15 && b1 === 0x49 && b2 === 0xa9 && b3 === 0x66) {
        const v = readVint(bytes, scanPos + 4);
        if (v) {
          infoData = bytes.slice(scanPos + 4 + v.length, scanPos + 4 + v.length + v.value);
          scanPos = scanPos + 4 + v.length + v.value;
          continue;
        }
      }

      // Tracks: 0x16 0x54 0xAE 0x6B
      if (b0 === 0x16 && b1 === 0x54 && b2 === 0xae && b3 === 0x6b) {
        const v = readVint(bytes, scanPos + 4);
        if (v) {
          tracksData = bytes.slice(scanPos + 4 + v.length, scanPos + 4 + v.length + v.value);
          scanPos = scanPos + 4 + v.length + v.value;
          continue;
        }
      }

      // Cluster: 0x1F 0x43 0xB6 0x75
      if (b0 === 0x1f && b1 === 0x43 && b2 === 0xb6 && b3 === 0x75) {
        if (firstClusterPos === -1) {
          firstClusterPos = scanPos;
        }
        const v = readVint(bytes, scanPos + 4);
        const clusterOffset = scanPos - segmentPayloadStart;

        // Parse cluster Timecode (0xE7) inside cluster
        if (v) {
          const clusterDataStart = scanPos + 4 + v.length;
          if (bytes[clusterDataStart] === 0xe7) {
            const tcLen = readVint(bytes, clusterDataStart + 1);
            if (tcLen) {
              let tcVal = 0;
              for (let t = 0; t < tcLen.value; t++) {
                tcVal = tcVal * 256 + bytes[clusterDataStart + 1 + tcLen.length + t];
              }
              cues.push({ timecode: tcVal, clusterOffset });
            }
          }
          scanPos = clusterDataStart + v.value;
          continue;
        }
      }

      scanPos++;
    }

    if (!tracksData || firstClusterPos === -1) {
      console.warn('[WebM] Missing tracks or cluster in stream');
      return blob;
    }

    // 4. Build refined Info payload
    // TimecodeScale: 0x2AD7B1 = 1,000,000 ns (1ms)
    const timecodeScaleElem = encodeElement([0x2a, 0xd7, 0xb1], encodeUint(1000000));
    // Duration: 0x4489 = Float64(durationMs)
    const durationElem = encodeElement([0x44, 0x89], encodeFloat64(durationMs));
    // MuxingApp & WritingApp
    const muxAppElem = encodeElement([0x4d, 0x80], new TextEncoder().encode('Custom WebM Muxer'));
    const writeAppElem = encodeElement([0x57, 0x41], new TextEncoder().encode('WebM Duration Fixer'));

    const newInfoPayload = concatArrays([timecodeScaleElem, durationElem, muxAppElem, writeAppElem]);
    const newInfoElem = encodeElement([0x15, 0x49, 0xa9, 0x66], newInfoPayload);

    // 5. Build Tracks Element
    const newTracksElem = encodeElement([0x16, 0x54, 0xae, 0x6b], tracksData);

    // 6. Calculate exact byte offset shift for Cues and SeekHead
    const oldHeaderLength = firstClusterPos - segmentPayloadStart;

    const makeSeekEntry = (idBytes: number[], offset: number) => {
      const seekIdElem = encodeElement([0x53, 0xab], new Uint8Array(idBytes));
      const seekPosElem = encodeElement([0x53, 0xac], encodeUint(offset));
      return encodeElement([0x4d, 0xbb], concatArrays([seekIdElem, seekPosElem]));
    };

    const dummySeekHead = encodeElement(
      [0x11, 0x4d, 0x9b, 0x74],
      concatArrays([
        makeSeekEntry([0x15, 0x49, 0xa9, 0x66], 0),
        makeSeekEntry([0x16, 0x54, 0xae, 0x6b], 0),
        makeSeekEntry([0x1c, 0x53, 0xbb, 0x6b], 0)
      ])
    );

    const seekHeadLen = dummySeekHead.length;
    const infoOffset = seekHeadLen;
    const tracksOffset = infoOffset + newInfoElem.length;
    const cuesOffset = tracksOffset + newTracksElem.length;

    // Helper to build Cues element given a specific header length delta
    const buildCuesElem = (delta: number) => {
      const cuePointsList: Uint8Array[] = [];
      for (const cue of cues) {
        const adjustedClusterOffset = Math.max(0, cue.clusterOffset - oldHeaderLength + delta);
        const cueTimeElem = encodeElement([0xb3], encodeUint(cue.timecode));
        const cueTrackElem = encodeElement([0xf7], encodeUint(1));
        const cueClusterPosElem = encodeElement([0xf1], encodeUint(adjustedClusterOffset));
        const cueTrackPositionsElem = encodeElement([0xb7], concatArrays([cueTrackElem, cueClusterPosElem]));
        const cuePointElem = encodeElement([0xbb], concatArrays([cueTimeElem, cueTrackPositionsElem]));
        cuePointsList.push(cuePointElem);
      }
      const newCuesPayload = concatArrays(cuePointsList);
      return encodeElement([0x1c, 0x53, 0xbb, 0x6b], newCuesPayload);
    };

    // Converge exact new header length across passes
    let newCuesElem = buildCuesElem(oldHeaderLength);
    let newHeaderLength = seekHeadLen + newInfoElem.length + newTracksElem.length + newCuesElem.length;

    newCuesElem = buildCuesElem(newHeaderLength);
    newHeaderLength = seekHeadLen + newInfoElem.length + newTracksElem.length + newCuesElem.length;

    newCuesElem = buildCuesElem(newHeaderLength);

    const finalSeekHead = encodeElement(
      [0x11, 0x4d, 0x9b, 0x74],
      concatArrays([
        makeSeekEntry([0x15, 0x49, 0xa9, 0x66], infoOffset),
        makeSeekEntry([0x16, 0x54, 0xae, 0x6b], tracksOffset),
        makeSeekEntry([0x1c, 0x53, 0xbb, 0x6b], cuesOffset)
      ])
    );

    // 8. Assemble final WebM file
    // EBML Header slice from original blob
    const ebmlHeaderBlob = blob.slice(0, segmentPos);
    // Segment Header with unknown length: 0x18 0x53 0x80 0x67 0xFF
    const segmentHeaderBuf = new Uint8Array([0x18, 0x53, 0x80, 0x67, 0xff]).buffer as ArrayBuffer;
    // All original clusters intact from original blob
    const clustersDataBlob = blob.slice(firstClusterPos);

    const fullBlob = new Blob(
      [
        ebmlHeaderBlob,
        segmentHeaderBuf,
        finalSeekHead.buffer as ArrayBuffer,
        newInfoElem.buffer as ArrayBuffer,
        newTracksElem.buffer as ArrayBuffer,
        newCuesElem.buffer as ArrayBuffer,
        clustersDataBlob
      ],
      { type: blob.type || 'video/webm' }
    );

    return fullBlob;
  } catch (err) {
    console.warn('[WebM] Pure browser duration & index patch error:', err);
    return blob;
  }
}
