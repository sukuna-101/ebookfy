import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePlainTextBook, parseRtfToText, sanitizeBookHtml} from './documentParser';

test('parsePlainTextBook splits text by chapter headings', () => {
  const text = `Capítulo 1: A Chegada\nEra uma noite escura.\n\nCapítulo 2: O Retorno\nO sol nasceu.`;
  const chapters = parsePlainTextBook(text, 'Crônicas');
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, 'Capítulo 1: A Chegada');
  assert.equal(chapters[1].title, 'Capítulo 2: O Retorno');
});

test('parseRtfToText extracts plain paragraphs and skips font tables', () => {
  const rtf = `{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}Primeiro parágrafo.\\par Segundo parágrafo.}`;
  const out = parseRtfToText(rtf);
  assert.equal(out, 'Primeiro parágrafo.\n\nSegundo parágrafo.');
});

test('sanitizeBookHtml removes scripts and event handlers', () => {
  const dirty = `<p onclick="alert(1)">Texto</p><script>evil()</script><a href="javascript:void(0)">Link</a>`;
  const clean = sanitizeBookHtml(dirty);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('javascript:'), false);
});
