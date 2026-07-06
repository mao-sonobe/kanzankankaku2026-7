import { buildChunkedSegments } from "../lib/chunk-code.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ROLE_LABEL = {
  state: "状態管理",
  "event-handler": "イベントハンドラ",
  "api-fetch": "APIフェッチ",
  jsx: "見た目(JSX)",
  logic: "ロジック",
  import: "インポート",
  style: "スタイル",
  other: "その他",
};

/**
 * Claudeが実際に書いたコードと、選んだ空欄(blanks)から、
 * その場で正誤判定できる穴埋め演習ウィジェット(自己完結HTML)を組み立てる。
 * 説明文はここに含めない(design systemの規約通り、説明はClaudeの応答テキスト側で行う)。
 */
export function buildCodeBlankWidget({ path, code, blanks }) {
  const segments = buildChunkedSegments(code, blanks);
  const slotCount = segments.filter((s) => s.type === "slot").length;
  if (slotCount === 0) {
    return { widgetCode: null, slotCount: 0 };
  }

  const widgetId = `blank-${Math.random().toString(36).slice(2, 8)}`;

  const body = segments
    .map((seg) => {
      if (seg.type === "text") return escapeHtml(seg.content);
      const { id, role, label, choices } = seg.slot;
      const roleLabel = ROLE_LABEL[role] ?? role;
      const options = choices
        .map(
          (c) =>
            `<option value="${escapeHtml(c.id)}" data-correct="${c.isCorrect}">${escapeHtml(c.code)}</option>`
        )
        .join("");
      return (
        `<select class="blank-select" data-slot="${escapeHtml(id)}" ` +
        `title="${escapeHtml(label)}(${escapeHtml(roleLabel)})">` +
        `<option value="" selected>${escapeHtml(label)}</option>${options}</select>`
      );
    })
    .join("");

  const widgetCode = `<h2 class="sr-only" style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0);">${escapeHtml(path)}の穴埋めコード演習</h2>
<div id="${widgetId}">
  <pre style="font-family: var(--font-mono); font-size: 13px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; background: var(--surface-1); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 1rem; margin: 0;">${body}</pre>
  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
    <span class="blank-progress">0/${slotCount} 正解</span>
    <button type="button" class="blank-reveal">正解を表示</button>
  </div>
</div>
<style>
#${widgetId} select.blank-select { font-family: var(--font-mono); font-size: 13px; border-radius: var(--radius); border: 0.5px dashed var(--border-strong); padding: 2px 6px; background: var(--surface-2); color: var(--text-secondary); margin: 0 2px; }
#${widgetId} select.blank-select.is-correct { border-style: solid; border-color: var(--border-success); color: var(--text-success); }
#${widgetId} select.blank-select.is-wrong { border-style: solid; border-color: var(--border-danger); color: var(--text-danger); }
</style>
<script>
(function(){
  var root = document.getElementById(${JSON.stringify(widgetId)});
  var selects = root.querySelectorAll("select.blank-select");
  var progress = root.querySelector(".blank-progress");
  var revealBtn = root.querySelector(".blank-reveal");
  var total = selects.length;

  function updateProgress() {
    var correct = 0;
    selects.forEach(function (s) {
      if (s.classList.contains("is-correct")) correct++;
    });
    progress.textContent = correct + "/" + total + " 正解";
  }

  selects.forEach(function (select) {
    select.addEventListener("change", function () {
      var opt = select.options[select.selectedIndex];
      var correct = opt && opt.getAttribute("data-correct") === "true";
      select.classList.remove("is-correct", "is-wrong");
      select.classList.add(correct ? "is-correct" : "is-wrong");
      updateProgress();
    });
  });

  revealBtn.addEventListener("click", function () {
    Array.prototype.forEach.call(selects, function (select) {
      var correctOption = Array.prototype.find.call(select.options, function (o) {
        return o.getAttribute("data-correct") === "true";
      });
      if (correctOption) {
        select.value = correctOption.value;
        select.classList.remove("is-wrong");
        select.classList.add("is-correct");
      }
    });
    updateProgress();
  });
})();
</script>`;

  return { widgetCode, slotCount };
}
