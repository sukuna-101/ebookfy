import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareNatural,
  detectEmbeddedChapterKey,
  extractChapterNumber,
} from './naturalSort';

test('compareNatural sorts numbered pages without 10-before-2 bug', () => {
  const files = ['10.jpg', '2.jpg', '1.jpg', '11.jpg', '3.jpg', '004.webp'];
  const sorted = [...files].sort(compareNatural);
  assert.deepEqual(sorted, ['1.jpg', '2.jpg', '3.jpg', '004.webp', '10.jpg', '11.jpg']);
});

test('compareNatural sorts prefixed page names and chapters properly', () => {
  const items = [
    'page_10.png',
    'page_2.png',
    'page_001.png',
    'img_003.png',
  ];
  const sorted = [...items].sort(compareNatural);
  assert.deepEqual(sorted, ['img_003.png', 'page_001.png', 'page_2.png', 'page_10.png']);

  const chapters = ['Capítulo 10', 'Capítulo 2', 'Prólogo', 'Capítulo 1', 'Epílogo'];
  assert.deepEqual([...chapters].sort(compareNatural), [
    'Prólogo',
    'Capítulo 1',
    'Capítulo 2',
    'Capítulo 10',
    'Epílogo',
  ]);
});

test('extractChapterNumber parses diverse chapter naming patterns', () => {
  assert.equal(extractChapterNumber('Capítulo 001'), 1);
  assert.equal(extractChapterNumber('Cap. 12.5 - A Batalha'), 12.5);
  assert.equal(extractChapterNumber('Vol. 02 Ch. 18'), 18);
  assert.equal(extractChapterNumber('007.jpg'), 7);
});

test('detectEmbeddedChapterKey detects flat chapter+page filenames', () => {
  assert.equal(detectEmbeddedChapterKey('cap01_001.jpg'), 'Capítulo 001');
  assert.equal(detectEmbeddedChapterKey('ch2-015.webp'), 'Capítulo 002');
  assert.equal(detectEmbeddedChapterKey('001.jpg'), null);
});
