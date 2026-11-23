import React, {useEffect, useRef, useState} from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import {getBlob} from '../../services/db';
import type {Chapter, ReadingProgress, Work} from '../../types/ebookfy';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

interface PdfReaderProps {
  work: Work;
  chapters: Chapter[];
  initialProgress?: ReadingProgress;
  onSaveProgress: (update: {
    chapterId: string;
    chapterIndex: number;
    pageIndex: number;
    scrollRatio: number;
    percentComplete: number;
    markChapterDone?: boolean;
  }) => void;
  onClose: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  work,
  chapters,
  initialProgress,
  onSaveProgress,
  onClose,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(work.pageCount || 1);
  const [pageNum, setPageNum] = useState(
    Math.max(1, (initialProgress?.lastPageIndex ?? 0) + 1),
  );
  const [scale, setScale] = useState(1.25);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHitPage, setSearchHitPage] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let docRef: pdfjsLib.PDFDocumentProxy | null = null;
    if (!work.documentBlobId) return;

    getBlob(work.documentBlobId).then(async (rec) => {
      if (!rec || !active) return;
      const buf = new Uint8Array(await rec.blob.arrayBuffer());
      const doc = await pdfjsLib.getDocument({data: buf}).promise;
      if (!active) {
        await doc.cleanup();
        return;
      }
      docRef = doc;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    });

    return () => {
      active = false;
      docRef?.cleanup().catch(() => {});
    };
  }, [work.documentBlobId]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    pdfDoc.getPage(pageNum).then(async (page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({scale, rotation});
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({canvasContext: ctx, viewport, canvas}).promise;
    });

    const pct = Math.min(100, Math.round((pageNum / Math.max(1, numPages)) * 100));
    if (chapters[0]) {
      onSaveProgress({
        chapterId: chapters[0].id,
        chapterIndex: 0,
        pageIndex: pageNum - 1,
        scrollRatio: 0,
        percentComplete: pct,
        markChapterDone: pageNum >= numPages,
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum, scale, rotation, numPages, chapters, onSaveProgress]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfDoc || !searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    for (let i = pageNum; i <= numPages; i++) {
      const p = await pdfDoc.getPage(i);
      const tc = await p.getTextContent();
      const str = tc.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .toLowerCase();
      if (str.includes(q)) {
        setPageNum(i);
        setSearchHitPage(i);
        return;
      }
    }
    setSearchHitPage(-1);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#080607] text-[#F5EFF1]"
    >
      <header className="h-13 px-3 sm:px-5 border-b border-[#4A1522] bg-[#0D080A] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="p-2 rounded-lg hover:bg-[#390D18]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold truncate">{work.title}</span>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-1.5">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar texto no PDF..."
            className="h-8 w-44 px-2.5 rounded-lg bg-[#140C0F] border border-[#3E3136] text-xs"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="p-1.5 rounded-lg bg-[#390D18] text-white"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {searchHitPage === -1 && (
            <span className="text-[11px] text-[#A89DA2]">Não encontrado</span>
          )}
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            aria-label="Reduzir zoom"
            className="p-2 rounded-lg hover:bg-[#390D18]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums w-11 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.6, s + 0.2))}
            aria-label="Aumentar zoom"
            className="p-2 rounded-lg hover:bg-[#390D18]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Girar página"
            className="p-2 rounded-lg hover:bg-[#390D18]"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                rootRef.current?.requestFullscreen?.().catch(() => {});
                setIsFullscreen(true);
              } else {
                document.exitFullscreen?.().catch(() => {});
                setIsFullscreen(false);
              }
            }}
            aria-label="Tela cheia"
            className="p-2 rounded-lg hover:bg-[#390D18]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto flex justify-center items-start p-4 sm:p-6 bg-[#060506]">
        <canvas
          ref={canvasRef}
          className="shadow-2xl border border-[#2C181E] max-w-full h-auto"
        />
      </div>

      <footer className="h-12 px-4 border-t border-[#4A1522] bg-[#0D080A] flex items-center justify-center gap-4 shrink-0">
        <button
          type="button"
          disabled={pageNum <= 1}
          onClick={() => setPageNum((p) => Math.max(1, p - 1))}
          className="px-3 py-1 rounded-lg border border-[#3E3136] text-xs disabled:opacity-35 inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>
        <span className="text-xs tabular-nums">
          Página {pageNum} de {numPages}
        </span>
        <button
          type="button"
          disabled={pageNum >= numPages}
          onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
          className="px-3 py-1 rounded-lg bg-[#E5092D] text-white text-xs font-semibold disabled:opacity-35 inline-flex items-center gap-1"
        >
          <span>Próxima</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  );
};
