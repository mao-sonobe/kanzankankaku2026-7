import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import type { ExecutionFile, ExecutionLogListener, ExecutionProvider } from "./types";

// WebContainerはブラウザタブごとに一度しかboot()できないため、
// モジュールスコープのシングルトンとしてインスタンス/起動Promiseを保持する。
// これによりクライアントサイドナビゲーション(/build -> /learn)をまたいでも
// 同一のWebContainerインスタンス・実行中プロセスを維持できる。
let bootPromise: Promise<WebContainer> | null = null;
let devServerUrl: string | null = null;

function toFileSystemTree(files: ExecutionFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const { path, content } of files) {
    const parts = path.split("/").filter((part) => part && part !== ".");
    let cursor = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const existing = cursor[part];
      if (existing && "directory" in existing) {
        cursor = existing.directory;
      } else {
        const dir: FileSystemTree = {};
        cursor[part] = { directory: dir };
        cursor = dir;
      }
    }
    const fileName = parts[parts.length - 1];
    cursor[fileName] = { file: { contents: content } };
  }

  return tree;
}

export class WebContainerExecutionProvider implements ExecutionProvider {
  private container: WebContainer | null = null;

  async boot(onLog?: ExecutionLogListener): Promise<void> {
    if (!bootPromise) {
      const { WebContainer } = await import("@webcontainer/api");
      onLog?.("WebContainerを起動しています…");
      bootPromise = WebContainer.boot();
    }
    this.container = await bootPromise;
  }

  private ensureContainer(): WebContainer {
    if (!this.container) throw new Error("WebContainerが起動していません");
    return this.container;
  }

  async mountFiles(files: ExecutionFile[]): Promise<void> {
    const container = this.ensureContainer();
    await container.mount(toFileSystemTree(files));
  }

  async installAndRun(onLog?: ExecutionLogListener): Promise<string> {
    const container = this.ensureContainer();

    if (devServerUrl) {
      onLog?.("既に起動済みのプレビューを再利用します");
      return devServerUrl;
    }

    onLog?.("npm install を実行しています…");
    const install = await container.spawn("npm", ["install"]);
    install.output.pipeTo(
      new WritableStream({
        write(data) {
          onLog?.(data);
        },
      })
    );
    const installExitCode = await install.exit;
    if (installExitCode !== 0) {
      throw new Error(`npm install が失敗しました (exit code: ${installExitCode})`);
    }

    onLog?.("npm run dev を実行しています…");
    const dev = await container.spawn("npm", ["run", "dev"]);
    dev.output.pipeTo(
      new WritableStream({
        write(data) {
          onLog?.(data);
        },
      })
    );

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("開発サーバーの起動がタイムアウトしました"));
      }, 60_000);
      container.on("server-ready", (_port, serverUrl) => {
        clearTimeout(timeout);
        resolve(serverUrl);
      });
    });

    devServerUrl = url;
    return url;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const container = this.ensureContainer();
    await container.fs.writeFile(path, content);
  }
}

let providerSingleton: WebContainerExecutionProvider | null = null;

/** 現在の実行プロバイダーのインスタンスを返す。呼び出し元はこの関数のみに依存する。 */
export function getExecutionProvider(): WebContainerExecutionProvider {
  if (!providerSingleton) {
    providerSingleton = new WebContainerExecutionProvider();
  }
  return providerSingleton;
}
