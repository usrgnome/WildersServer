const _F32_ = new Float32Array(1);
const _U8_ = new Uint8Array(_F32_.buffer);

// perform addition sanity checks

// WRITING PACKETS
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const isDev = process.env.NODE_ENV === 'development';
const VERBOSE = isDev;

export class StreamWriter {
    _buffer = new ArrayBuffer(0xffff);
    $buffer = new Uint8Array(this._buffer);
    ptr = 0;
}

export function bytes(s: StreamWriter) {
    if (isDev && (s.ptr > s._buffer.byteLength)) throw new Error("missized");
    return new Uint8Array(s._buffer, 0, s.ptr).slice();
}

export function reset(s: StreamWriter) {
    s.ptr = 0;
    return s;
}

export function size(s: StreamWriter) {
    return s.ptr;
}

export function writeU8(s: StreamWriter, n: number) {
    if (VERBOSE && (n < 0 || n > 0xff || n !== Math.floor(n)))
        throw new Error('out of range 0-255 provided:' + n);

    s.$buffer[s.ptr++] = n & 0xff;
}

export function writeString(s: StreamWriter, str: string) {
    const l = str.length & 0xff;
    s.$buffer[s.ptr++] = l;
    for (let i = 0; i < l; i++) s.$buffer[s.ptr++] = str.charCodeAt(i);
}

export function writeUtf16(s: StreamWriter, str: string) {
    const bytes = textEncoder.encode(str);
    const l = bytes.length & 0xff;
    s.$buffer[s.ptr++] = l;
    for (let i = 0; i < l; i++) s.$buffer[s.ptr++] = bytes[i];
}

export function writeU16(s: StreamWriter, n: number) {
    if (VERBOSE && (n < 0 || n > 0xffff || n !== Math.floor(n)))
        throw new Error('out of range 0-35565 provided:' + n);
    s.$buffer[s.ptr++] = n & 0xff;
    s.$buffer[s.ptr++] = (n >> 8) & 0xff;
}

export function writeI32(s: StreamWriter, n: number) {
    if (VERBOSE && (n < 0 || n > 0xffffffff || n !== Math.floor(n)))
        throw new Error('out of range 0-4294967295 provided:' + n);
    s.$buffer[s.ptr++] = n & 0xff;
    s.$buffer[s.ptr++] = (n >> 8) & 0xff;
    s.$buffer[s.ptr++] = (n >> 16) & 0xff;
    s.$buffer[s.ptr++] = (n >> 24) & 0xff;
}

export function writeF32(s: StreamWriter, n: number) {
    _F32_[0] = n;
    s.$buffer[s.ptr++] = _U8_[0];
    s.$buffer[s.ptr++] = _U8_[1];
    s.$buffer[s.ptr++] = _U8_[2];
    s.$buffer[s.ptr++] = _U8_[3];
}

/*
Variable length encoding to write a unsigned int
*/
export function writeLEB128(s: StreamWriter, n: number) {
    if (VERBOSE && (n < 0 || n !== Math.floor(n)))
        throw new Error('out of range 0-4294967295 provided:' + n);
    do {
        let byte = n & 0x7f;
        n >>>= 7;
        if (n !== 0) {
            byte |= 0x80;
        }
        s.$buffer[s.ptr++] = byte & 0xff;
    } while (n !== 0);
}

// READING PACKETS

type T_U8 = 0;
type T_U16 = 1;
type T_STR = 2;
type T_F32 = 3;
type T_U32 = 4;
type stringMaxLength = number;
export type verifyType = T_U8 | [T_STR, stringMaxLength] | T_U16 | T_F32 | T_U32;

export class StreamReader {
    rU8: Uint8Array;
    rPtr = 0;

    static T_U8: T_U8 = 0;
    static T_U16: T_U16 = 1;
    static T_STR: T_STR = 2;
    static T_F32: T_F32 = 3;
    static T_U32: T_U32 = 4;

}

export function readFrom(s: StreamReader, ab: ArrayBuffer) {
    s.rPtr = 0;
    s.rU8 = new Uint8Array(ab);
}

export function hasMoreData(s: StreamReader): boolean {
    return s.rPtr < s.rU8.byteLength;
}

export function showPtr(s: StreamReader) {
    console.log(s.rU8, s.rPtr);
}

export function readU8(s: StreamReader): number {
    return s.rU8[s.rPtr++];
}

export function readU16(s: StreamReader): number {
    return s.rU8[s.rPtr++] | (s.rU8[s.rPtr++] << 8);
}

export function readI32(s: StreamReader): number {
    return (
        s.rU8[s.rPtr++] |
        (s.rU8[s.rPtr++] << 8) |
        (s.rU8[s.rPtr++] << 16) |
        (s.rU8[s.rPtr++] << 24)
    );
}

export function readF32(s: StreamReader): number {
    _U8_[0] = s.rU8[s.rPtr++];
    _U8_[1] = s.rU8[s.rPtr++];
    _U8_[2] = s.rU8[s.rPtr++];
    _U8_[3] = s.rU8[s.rPtr++];
    return _F32_[0];
}

export function readULEB128(s: StreamReader): number {
    let result = 0;
    let shift = 0;
    let byte = 0;
    while (true) {
        byte = s.rU8[s.rPtr++];
        result |= (byte & 0x7f) << shift;
        if ((byte & 0x80) == 0) break;
        shift += 7;
    }

    return result;
}

export function readString(s: StreamReader): string {
    let result = '';
    const len = s.rU8[s.rPtr++];
    for (let i = 0; i < len; i++)
        result += String.fromCharCode(s.rU8[s.rPtr++]);
    return result;
}

export function readUtf16(s: StreamReader): string {
    const len = s.rU8[s.rPtr++];
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = s.rU8[s.rPtr++];

    return textDecoder.decode(bytes);
}

export function skipPacket(s: StreamReader) {
    s.rPtr = s.rU8.length;
}

function _verify(s: StreamReader, verf: verifyType) {
    const ptr = s.rPtr;

    switch (verf[0]) {
        case StreamReader.T_U8:
            if (s.rU8.length - ptr < 1) return false;
            s.rPtr += 1;
            break;
        case StreamReader.T_F32:
            if (s.rU8.length - ptr < 4) return false;
            s.rPtr += 4;
            break;
        case StreamReader.T_STR:
            if (s.rU8.length - ptr < 1) return false;
            const len = s.rU8[s.rPtr];
            s.rPtr += 1;
            if (s.rU8.length - s.rPtr < Math.min(verf[1], len)) return false;
            s.rPtr += len;
            break;
        case StreamReader.T_U16:
            if (s.rU8.length - ptr < 2) {
                return false;
            }
            s.rPtr += 2;
            break;
        case StreamReader.T_U32:
            if (s.rU8.length - ptr < 4) return false;
            s.rPtr += 4;
            break;
    }

    return true;
}

export function verify(s: StreamReader, struct: verifyType[]) {
    const oldPtr = s.rPtr;
    let isVerified = true;

    for (let i = 0; i < struct.length; i++) {
        const verf = struct[i];
        if (!_verify(s, verf)) {
            isVerified = false;
            break;
        }
    }

    s.rPtr = oldPtr;
    return isVerified;
}

function runTests() {
    const w = new StreamWriter();
    const r = new StreamReader();
    writeU8(w, 8);
    writeU16(w, 4561);
    writeI32(w, 291873);
    writeString(w, "some str");
    writeF32(w, 3);
    writeLEB128(w, 123343);

    const d = bytes(w);


    readFrom(r, d);
    if (readU8(r) != 8) throw 1;
    if (readU16(r) != 4561) throw 2;
    if (readI32(r) != 291873) throw 3;
    if (readString(r) != 'some str') throw 4;

    let c = readF32(r);
    if (c != 3) throw 5 + " was: " + c;
    if (readULEB128(r) != 123343) throw 6;
}
runTests();