export class R2MultipartWriter {
  private readonly upload: R2MultipartUpload;
  private readonly partSize: number;
  private readonly chunks: Uint8Array[] = [];
  private buffered = 0;
  private nextPartNumber = 1;
  private uploadedParts: R2UploadedPart[] = [];

  constructor(upload: R2MultipartUpload, partSizeBytes = 8 * 1024 * 1024) {
    this.upload = upload;
    // R2 requires all non-final parts to be identical length. Use a fixed size >= 5 MiB
    this.partSize = Math.max(partSizeBytes, 5 * 1024 * 1024);
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (bytes.length === 0) return;
    this.chunks.push(bytes);
    this.buffered += bytes.length;
    if (this.buffered >= this.partSize) {
      await this.flushFullParts();
    }
  }

  private concatChunks(total: number): Uint8Array {
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  private async flushFullParts(): Promise<void> {
    if (this.buffered < this.partSize) return;
    const combined = this.concatChunks(this.buffered);
    let offset = 0;
    while (this.buffered - offset >= this.partSize) {
      const slice = combined.subarray(offset, offset + this.partSize);
      const partNum = this.nextPartNumber++;
      const uploaded = await this.upload.uploadPart(partNum, slice);
      this.uploadedParts.push(uploaded);
      offset += this.partSize;
    }
    // Remainder becomes new buffer
    const remaining = combined.subarray(offset);
    this.chunks.length = 0;
    if (remaining.length) this.chunks.push(remaining);
    this.buffered = remaining.length;
  }

  async close(): Promise<void> {
    // Flush any final full parts
    if (this.buffered >= this.partSize) {
      await this.flushFullParts();
    }
    // Upload trailing short part if present
    if (this.buffered > 0) {
      const finalBody = this.concatChunks(this.buffered);
      this.chunks.length = 0;
      this.buffered = 0;
      const uploaded = await this.upload.uploadPart(
        this.nextPartNumber++,
        finalBody
      );
      this.uploadedParts.push(uploaded);
    }
    await this.upload.complete(this.uploadedParts);
  }
}
