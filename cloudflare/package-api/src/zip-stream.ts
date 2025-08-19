// Minimal streaming ZIP writer for Cloudflare Workers
// - Stores files (no compression)
// - Uses data descriptor (flag bit 3) so sizes/CRC can be written after data

type EntryMeta = {
  name: string;
  offset: number;
  crc: number;
  size: number;
  date: number; // DOS date/time fields not used, write zeros
};

export class ZipStreamWriter {
  private sink: { write: (b: Uint8Array) => Promise<void> };
  private entries: EntryMeta[] = [];
  private offset = 0;

  constructor(sink: { write: (b: Uint8Array) => Promise<void> }) {
    this.sink = sink;
  }

  async addBytes(bytes: Uint8Array) {
    if (bytes.length === 0) return;
    await this.sink.write(bytes);
    this.offset += bytes.length;
  }

  private writeLE32(n: number): Uint8Array {
    const b = new Uint8Array(4);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, n >>> 0, true);
    return b;
  }

  private writeLE16(n: number): Uint8Array {
    const b = new Uint8Array(2);
    const dv = new DataView(b.buffer);
    dv.setUint16(0, n & 0xffff, true);
    return b;
  }

  private async writeLocalHeader(name: string): Promise<EntryMeta> {
    const nameBytes = new TextEncoder().encode(name);
    const sig = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const version = this.writeLE16(20);
    const flags = this.writeLE16(0x0008); // bit 3: data descriptor
    const method = this.writeLE16(0); // store
    const time = this.writeLE16(0);
    const date = this.writeLE16(0);
    const crc0 = this.writeLE32(0);
    const size0 = this.writeLE32(0);
    const usize0 = this.writeLE32(0);
    const nameLen = this.writeLE16(nameBytes.length);
    const extraLen = this.writeLE16(0);

    const parts = [
      sig,
      version,
      flags,
      method,
      time,
      date,
      crc0,
      size0,
      usize0,
      nameLen,
      extraLen,
      nameBytes,
    ];
    for (const p of parts) await this.addBytes(p);
    return {
      name,
      offset: this.offset - (30 + nameBytes.length),
      crc: 0,
      size: 0,
      date: 0,
    };
  }

  private async writeDataDescriptor(crc: number, size: number) {
    const sig = new Uint8Array([0x50, 0x4b, 0x07, 0x08]);
    await this.addBytes(sig);
    await this.addBytes(this.writeLE32(crc >>> 0));
    await this.addBytes(this.writeLE32(size >>> 0));
    await this.addBytes(this.writeLE32(size >>> 0));
  }

  private static crcTable: Uint32Array | null = null;
  private static initCrcTable() {
    if (this.crcTable) return;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    this.crcTable = table;
  }

  private static crcUpdate(crc: number, chunk: Uint8Array): number {
    this.initCrcTable();
    let c = crc ^ 0xffffffff;
    const table = this.crcTable!;
    for (let i = 0; i < chunk.length; i++)
      c = table[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async addFile(name: string, content: Uint8Array) {
    const meta = await this.writeLocalHeader(name);
    meta.crc = ZipStreamWriter.crcUpdate(0, content);
    meta.size = content.length;
    await this.addBytes(content);
    await this.writeDataDescriptor(meta.crc, meta.size);
    this.entries.push(meta);
  }

  async addStream(name: string, stream: ReadableStream<Uint8Array>) {
    const meta = await this.writeLocalHeader(name);
    let crc = 0;
    let size = 0;
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length) {
        crc = ZipStreamWriter.crcUpdate(crc, value);
        size += value.length;
        await this.addBytes(value);
      }
    }
    meta.crc = crc >>> 0;
    meta.size = size >>> 0;
    await this.writeDataDescriptor(meta.crc, meta.size);
    this.entries.push(meta);
  }

  async finalize() {
    const cdStart = this.offset;
    // central directory
    for (const e of this.entries) {
      const sig = new Uint8Array([0x50, 0x4b, 0x01, 0x02]);
      await this.addBytes(sig);
      await this.addBytes(this.writeLE16(20)); // version made by
      await this.addBytes(this.writeLE16(20)); // version needed
      await this.addBytes(this.writeLE16(0x0008)); // flags
      await this.addBytes(this.writeLE16(0)); // method store
      await this.addBytes(this.writeLE16(0)); // time
      await this.addBytes(this.writeLE16(0)); // date
      await this.addBytes(this.writeLE32(e.crc >>> 0));
      await this.addBytes(this.writeLE32(e.size >>> 0));
      await this.addBytes(this.writeLE32(e.size >>> 0));
      const nameBytes = new TextEncoder().encode(e.name);
      await this.addBytes(this.writeLE16(nameBytes.length));
      await this.addBytes(this.writeLE16(0)); // extra len
      await this.addBytes(this.writeLE16(0)); // comment len
      await this.addBytes(this.writeLE16(0)); // disk num
      await this.addBytes(this.writeLE16(0)); // internal attrs
      await this.addBytes(this.writeLE32(0)); // external attrs
      await this.addBytes(this.writeLE32(e.offset >>> 0));
      await this.addBytes(nameBytes);
    }
    const cdEnd = this.offset;
    const cdSize = cdEnd - cdStart;
    const sig = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
    await this.addBytes(sig);
    await this.addBytes(this.writeLE16(0));
    await this.addBytes(this.writeLE16(0));
    await this.addBytes(this.writeLE16(this.entries.length));
    await this.addBytes(this.writeLE16(this.entries.length));
    await this.addBytes(this.writeLE32(cdSize >>> 0));
    await this.addBytes(this.writeLE32(cdStart >>> 0));
    await this.addBytes(this.writeLE16(0)); // comment length
    // No-op; caller closes underlying sink
  }
}
