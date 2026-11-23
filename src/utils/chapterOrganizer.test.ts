import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeImageEntries} from './chapterOrganizer';

test('organizeImageEntries separates works, orders chapters 1..10, and sorts pages naturally', () => {
  const entries = [
    {relativePath: 'Solo Leveling/Capítulo 10/10.jpg', fileName: '10.jpg', sizeBytes: 100, mimeType: 'image/jpeg', payloadRef: '1'},
    {relativePath: 'Solo Leveling/Capítulo 10/2.jpg', fileName: '2.jpg', sizeBytes: 100, mimeType: 'image/jpeg', payloadRef: '2'},
    {relativePath: 'Solo Leveling/Capítulo 2/1.jpg', fileName: '1.jpg', sizeBytes: 100, mimeType: 'image/jpeg', payloadRef: '3'},
    {relativePath: 'Solo Leveling/Capítulo 1/2.jpg', fileName: '2.jpg', sizeBytes: 100, mimeType: 'image/jpeg', payloadRef: '4'},
    {relativePath: 'Solo Leveling/Capítulo 1/1.jpg', fileName: '1.jpg', sizeBytes: 100, mimeType: 'image/jpeg', payloadRef: '5'},
  ];

  const works = organizeImageEntries(entries, 'Import');
  assert.equal(works.length, 1);
  assert.equal(works[0].title, 'Solo Leveling');
  assert.deepEqual(
    works[0].chapters.map((c) => c.title),
    ['Capítulo 1', 'Capítulo 2', 'Capítulo 10'],
  );
  assert.deepEqual(
    works[0].chapters[0].pages.map((p) => p.fileName),
    ['1.jpg', '2.jpg'],
  );
  assert.deepEqual(
    works[0].chapters[2].pages.map((p) => p.fileName),
    ['2.jpg', '10.jpg'],
  );
});

test('organizeImageEntries strips root collection wrapper when importing a collection folder', () => {
  const entries = [
    {relativePath: 'Ebookfy/Obra A/Capítulo 1/001.png', fileName: '001.png', sizeBytes: 10, mimeType: 'image/png', payloadRef: 'a'},
    {relativePath: 'Ebookfy/Obra B/Capítulo 1/001.png', fileName: '001.png', sizeBytes: 10, mimeType: 'image/png', payloadRef: 'b'},
  ];
  const works = organizeImageEntries(entries, 'Ebookfy');
  assert.deepEqual(works.map((w) => w.title), ['Obra A', 'Obra B']);
});
