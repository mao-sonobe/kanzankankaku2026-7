// コード実行エンジンの抽象化。
// v1実装は WebContainerExecutionProvider の1つのみだが、将来Python/Go等の
// サーバーサイドサンドボックス(Docker, E2B等)を追加する際にUI層・学習ロジック層を
// 変更せずに済むよう、この interface を経由して呼び出す。

export interface ExecutionFile {
  path: string;
  content: string;
}

export type ExecutionLogListener = (line: string) => void;

export interface ExecutionProvider {
  /** 実行環境を起動する(一度だけ呼び出し可能) */
  boot(onLog?: ExecutionLogListener): Promise<void>;
  /** ファイル一式をマウントする */
  mountFiles(files: ExecutionFile[]): Promise<void>;
  /** 依存関係をインストールし、開発サーバーを起動する。プレビューURLを返す */
  installAndRun(onLog?: ExecutionLogListener): Promise<string>;
  /** 実行中のファイルを1つ更新する(ブロック穴埋め学習でのライブ反映に使用) */
  writeFile(path: string, content: string): Promise<void>;
}
