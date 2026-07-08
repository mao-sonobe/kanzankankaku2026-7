"use client";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { EditorView } from "@codemirror/view";

function languageExtensionFor(path: string) {
  if (path.endsWith(".json")) return json();
  if (path.endsWith(".css")) return css();
  if (path.endsWith(".js") || path.endsWith(".jsx") || path.endsWith(".mjs")) {
    return javascript({ jsx: true });
  }
  return javascript();
}

export function PlainCodeView({ path, content }: { path: string; content: string }) {
  return (
    <CodeMirror
      value={content}
      height="480px"
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
      extensions={[languageExtensionFor(path), EditorView.editable.of(false)]}
    />
  );
}
