"use client";

import { cn } from "@/lib/utils";
import { Folder, FileCode } from "lucide-react";
import type { FeatureColor } from "@/lib/domain/feature-colors";

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };

  for (const fullPath of paths) {
    const parts = fullPath.split("/");
    let cursor = root;
    let accumulated = "";
    parts.forEach((part, i) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      const isFile = i === parts.length - 1;
      let child = cursor.children.find((c) => c.name === part && c.isFile === isFile);
      if (!child) {
        child = { name: part, path: accumulated, isFile, children: [] };
        cursor.children.push(child);
      }
      cursor = child;
    });
  }

  // フォルダを先に、それぞれ名前順で並べる(VS Codeの表示順に寄せる)。
  function sortTree(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }
  sortTree(root);

  return root.children;
}

function TreeRow({
  node,
  depth,
  selectedPath,
  learnablePaths,
  featureColorByPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  learnablePaths: Set<string>;
  featureColorByPath?: Map<string, FeatureColor>;
  onSelect: (path: string) => void;
}) {
  if (!node.isFile) {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <Folder className="size-3.5 shrink-0" />
          {node.name}
        </div>
        {node.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            learnablePaths={learnablePaths}
            featureColorByPath={featureColorByPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const isSelected = node.path === selectedPath;
  const isLearnable = learnablePaths.has(node.path);
  const featureColor = featureColorByPath?.get(node.path);

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors",
        featureColor
          ? cn(featureColor.bg, featureColor.text, "font-medium")
          : isSelected
            ? "bg-primary/10 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted",
        isSelected && !featureColor && "bg-primary/10"
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <FileCode className="size-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
      {isLearnable && !featureColor && (
        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" title="穴埋め学習対象" />
      )}
    </button>
  );
}

export function FileTree({
  paths,
  selectedPath,
  learnablePaths,
  featureColorByPath,
  onSelect,
}: {
  paths: string[];
  selectedPath: string | null;
  learnablePaths: Set<string>;
  /** 指定時、アクティブな機能に関わるファイルをそのfeatureColorで塗る */
  featureColorByPath?: Map<string, FeatureColor>;
  onSelect: (path: string) => void;
}) {
  const tree = buildTree(paths);

  return (
    <div className="space-y-0.5 py-1">
      {tree.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          learnablePaths={learnablePaths}
          featureColorByPath={featureColorByPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
