export function concatUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}

export function printUint8Array(buf?: Uint8Array): string | undefined {
  if (buf) {
    return [...buf].map((x) => x.toString(16).padStart(2, "0")).join(" ");
  }
  return undefined;
}

export class ArrayWriter {
  private offset = 0;
  private buf = new ArrayBuffer(4);
  private view = new DataView(this.buf);

  constructor(private litteEndian = true) {}

  public get length() {
    return this.offset;
  }

  public get(index: number): number {
    return this.view.getUint8(index);
  }

  public writeUint8(v: number) {
    this.grow();

    this.view.setUint8(this.offset, v);
    this.offset++;
  }

  public writeUint16(v: number) {
    this.grow(2);

    this.view.setUint16(this.offset, v, this.litteEndian);
    this.offset += 2;
  }

  public writeUint8s(values: number[]) {
    this.grow(values.length);

    for (const v of values) {
      this.view.setUint8(this.offset, v);
      this.offset++;
    }
  }

  public writeFloat32(v: number) {
    this.grow(4);

    this.view.setFloat32(this.offset, v, this.litteEndian);
    this.offset += 4;
  }

  public array(): Uint8Array {
    return new Uint8Array(this.buf, 0, this.offset);
  }

  private grow(num = 1) {
    if (this.offset + num >= this.buf.byteLength) {
      let newSize = this.buf.byteLength;
      while (newSize < this.offset + num) {
        newSize *= 2;
      }

      const newBuf = new ArrayBuffer(newSize);
      new Uint8Array(newBuf).set(new Uint8Array(this.buf));
      this.buf = newBuf;
      this.view = new DataView(this.buf);
    }
  }
}

export class ArrayReader {
  private offset = 0;
  private buf = new ArrayBuffer(0);
  private view = new DataView(this.buf);

  constructor(buffer?: Uint8Array, private litteEndian = true) {
    if (buffer) {
      this.buf = new ArrayBuffer(buffer.length);
      new Uint8Array(this.buf).set(buffer);
      this.view = new DataView(this.buf);
    }
  }

  public advance(num: number) {
    this.offset += num;
  }

  public remaining(): number {
    return this.buf.byteLength - this.offset;
  }

  public peekUint8(): number {
    return this.view.getUint8(this.offset);
  }

  public readUint8(): number {
    const val = this.peekUint8();
    this.advance(1);
    return val;
  }

  public peekUint16(): number {
    return this.view.getUint16(this.offset, this.litteEndian);
  }

  public readUint16(): number {
    const val = this.peekUint16();
    this.advance(2);
    return val;
  }

  public peekUint32(): number {
    return this.view.getUint32(this.offset, this.litteEndian);
  }

  public readUint32(): number {
    const val = this.peekUint32();
    this.advance(4);
    return val;
  }

  public peekFloat32(): number {
    return this.view.getFloat32(this.offset, this.litteEndian);
  }

  public readFloat32(): number {
    const val = this.peekFloat32();
    this.advance(4);
    return val;
  }
}
