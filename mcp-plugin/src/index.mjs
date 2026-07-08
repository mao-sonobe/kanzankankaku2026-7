import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildStackGraphSvg } from "./widgets/stack-graph.mjs";
import { buildCodeBlankWidget } from "./widgets/code-blank.mjs";

const STACK_CATEGORIES = ["frontend", "backend", "infra", "data", "other"];
const BLOCK_ROLES = [
  "state",
  "event-handler",
  "api-fetch",
  "jsx",
  "logic",
  "import",
  "style",
  "other",
];

const server = new McpServer({
  name: "output-input-learning",
  version: "0.1.0",
});

server.tool(
  "build_stack_graph_widget",
  "実際に選んだ技術スタックのノードと、技術間でどんなデータが受け渡されるかを示す関係図(SVG)を組み立てる。" +
    "生成した widget_code はそのまま visualize/show_widget ツールに渡すこと。" +
    "ノード数は3〜8個、dataFlowは5語程度の短い説明にすること(詳しい説明はチャット本文側で行う)。",
  {
    nodes: z
      .array(
        z.object({
          id: z.string().describe("ノードの一意なid"),
          label: z.string().describe("実際の固有技術名(例: Next.js, PostgreSQL)"),
          category: z.enum(STACK_CATEGORIES),
        })
      )
      .min(1)
      .max(8),
    edges: z
      .array(
        z.object({
          source: z.string().describe("nodesのid"),
          target: z.string().describe("nodesのid"),
          dataFlow: z
            .string()
            .describe("この2つの技術間で実際に受け渡されるデータの短い説明(5語程度。例: JSON形式のフォーム入力)"),
        })
      )
      .default([]),
  },
  async ({ nodes, edges }) => {
    const widgetCode = buildStackGraphSvg({ nodes, edges });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ widgetCode }),
        },
      ],
    };
  }
);

server.tool(
  "build_code_blank_widget",
  "実際に書いたコードから、指定した空欄(blanks)についてその場で正誤判定できる穴埋め演習ウィジェット(自己完結HTML)を組み立てる。" +
    "呼び出す前に、このコードで何が重要かをチャット本文で先に説明しておくこと(このツールの出力に説明文は含まれない)。" +
    "生成した widget_code はそのまま visualize/show_widget ツールに渡すこと。",
  {
    path: z.string().describe("ファイルパス(表示用)"),
    code: z.string().describe("穴埋め対象のファイルの完全なソースコード"),
    blanks: z
      .array(
        z.object({
          text: z
            .string()
            .describe("codeから一字一句そのままコピーした、空欄にする箇所(1行に収まる範囲)"),
          role: z.enum(BLOCK_ROLES),
          label: z.string().describe("この空欄が担う役割の短い日本語ラベル(例: 状態の初期化)"),
          wrongAnswers: z
            .array(z.string())
            .min(1)
            .max(3)
            .describe("textと同程度の長さの、もっともらしいが誤ったコード片"),
        })
      )
      .min(1)
      .max(8),
  },
  async ({ path, code, blanks }) => {
    const { widgetCode, slotCount } = buildCodeBlankWidget({ path, code, blanks });
    if (!widgetCode) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "指定されたblanksがcode内に見つからず、空欄を1つも作成できませんでした。blanks[].textがcodeからの厳密な抜粋になっているか確認してください。",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ widgetCode, slotCount }),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
