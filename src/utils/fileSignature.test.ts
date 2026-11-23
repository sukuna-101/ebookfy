import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkZipBombRisk,
  detectFileTypeFromBytes,
  isSafeArchiveEntryPath,
} from './fileSignature';

test('detectFileTypeFromBytes identifies real formats by magic bytes', () => {
  assert.equal(
    detectFileTypeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'fake.jpg'),
    'png',
  );
  assert.equal(
    detectFileTypeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), '001.jpg'),
    'jpeg',
  );
  assert.equal(
    detectFileTypeFromBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'doc.pdf'),
    'pdf',
  );
  assert.equal(
    detectFileTypeFromBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'livro.epub'),
    'epub',
  );
  assert.equal(
    detectFileTypeFromBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'manga.cbz'),
    'zip',
  );
});

test('isSafeArchiveEntryPath blocks path traversal and executables', () => {
  assert.equal(isSafeArchiveEntryPath('Cap 01/001.jpg'), true);
  assert.equal(isSafeArchiveEntryPath('../../etc/passwd'), false);
  assert.equal(isSafeArchiveEntryPath('/abs/path/001.jpg'), false);
  assert.equal(isSafeArchiveEntryPath('payload.exe'), false);
  assert.equal(isSafeArchiveEntryPath('script.js'), false);
  assert.equal(isSafeArchiveEntryPath('__MACOSX/._001.jpg'), false);
});

test('checkZipBombRisk flags extreme decompression ratios', () => {
  assert.equal(checkZipBombRisk(1024 * 1024, 2 * 1024 * 1024).safe, true);
  assert.equal(checkZipBombRisk(1000, 100 * 1024 * 1024).safe, false);
});
