// Wire up Monaco's web workers. Without this, Monaco JSON language service
// (validation, completion, hover) silently no-ops in production builds because
// it can't load its workers. The `?worker` imports tell Vite to emit each
// worker as a standalone chunk and give us real `Worker` constructors —
// this is the standard Vite + Monaco recipe.
//
// https://github.com/vitejs/vite/discussions/1791

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};
