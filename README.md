# Ebookfy — Biblioteca Digital e Leitor Universal 100% Local

> **Sua biblioteca. Suas regras.**  
> Aplicação web e **PWA instalável** (Desktop e Mobile) 100% *offline-first* para organizar e ler mangás, manhwas, webtoons, HQs, livros e documentos diretamente no dispositivo, sem servidores externos ou nuvem.

🔗 **Demo online (GitHub Pages):** [`https://sukuna-101.github.io/ebookfy/`](https://sukuna-101.github.io/ebookfy/)

---

## Principais Funcionalidades

- **Leitor Universal Multi-Formato**
  - **Manhwa / Webtoon:** rolagem vertical infinita contínua com controle de largura, espaçamento entre painéis e fundo configurável (Preto, Cinza, Branco).
  - **Mangá / HQ:** modos página simples, dupla, leitura horizontal (LTR/RTL) e atalhos de teclado.
  - **Livros e Documentos (`EPUB`, `DOCX`, `ODT`, `RTF`, `TXT`):** leitor tipográfico com **Modo Noturno Confortável** (`#000000` puro com texto `#FFFFFF`), modo Claro, Sépia e Gótico, controle de fonte, tamanho e espaçamento.
  - **PDF Nativo (`pdfjs-dist`):** renderização em alta definição, zoom, rotação e busca textual por página.
- **Extração Preguiçosa (Lazy) de Arquivos Grandes (`.zip` / `.cbz` / `.tar` / `.gz`):** processa volumes grandes via `BlobReader` sob demanda com cache LRU de `ObjectURL`, evitando estourar a memória RAM.
- **Ordenação Natural Inteligente:** reconhece automaticamente volumes, capítulos (`Cap. 1`, `Cap. 2` ... `Cap. 10`, `12.5`) e páginas numeradas sem erros lexicográficos.
- **Armazenamento Local Privado (IndexedDB):**
  - Gerenciador de cota configurável pelo usuário (MB/GB).
  - Backup completo e restauração local em `.zip`.
  - Bloqueio opcional por senha local derivada com **PBKDF2 + SHA-256** (Web Crypto API).
- **PWA Offline-First:** instalável no Windows, Linux, macOS e Android com funcionamento offline via Service Worker.

---

## Stack Tecnológica

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Build & PWA:** Vite 8, `vite-plugin-pwa` (Workbox)
- **Processamento no Navegador:** `@zip.js/zip.js`, `pdfjs-dist`, Web Crypto API, IndexedDB (`idb`)
- **Testes Unitários:** `node:test` via `tsx`
- **CI/CD:** GitHub Actions + GitHub Pages

---

## Como Rodar Localmente

Pré-requisito: **Node.js 20+**

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (http://localhost:3000)
npm run dev
```

### Outros Comandos Úteis

```bash
# Verificar tipos TypeScript
npm run lint

# Executar testes unitários (ordenação natural, parser de documentos, assinaturas, criptografia)
npm test

# Gerar build de produção (pasta dist/)
npm run build
```

---

## Deploy Automático no GitHub Pages

O workflow em `.github/workflows/deploy.yml` executa automaticamente verificação de tipos, testes unitários e build a cada push na branch `main`, publicando a pasta `dist/` com caminhos relativos (`base: './'`).
