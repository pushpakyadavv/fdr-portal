// js/upload-guard.js
const UploadGuard = {
  MAX_MB: 5,
  ALLOWED_MIME: ['application/pdf','image/jpeg','image/png'],
  ALLOWED_EXT: ['.pdf','.jpg','.jpeg','.png'],

  async validate(file) {
    if (file.size > this.MAX_MB * 1024 * 1024) throw new Error(`Max ${this.MAX_MB} MB`);
    if (!this.ALLOWED_MIME.includes(file.type)) throw new Error('Only PDF/JPG/PNG');
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!this.ALLOWED_EXT.includes(ext)) throw new Error('Invalid extension');

    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const isPdf = head[0] === 0x25 && head[1] === 0x50;
    const isJpg = head[0] === 0xFF && head[1] === 0xD8;
    const isPng = head[0] === 0x89 && head[1] === 0x50;
    if (!(isPdf || isJpg || isPng)) throw new Error('File content mismatch');
    return true;
  },

  async sha256(file) {
    const buf = await file.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('');
  }
};
window.UploadGuard = UploadGuard;