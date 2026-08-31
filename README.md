# nano-claude-code-typescript

> 本项目是一个教学导向的开源实践项目。我们抛弃 LangChain、抛弃 LlamaIndex，甚至抛弃官方 SDK，仅使用 TypeScript 语言标准库（以及少量辅助库），从零开始，一步步写一个 Claude-Code like 的 Coding Agent。

**nano-claude-code-typescript** 是一个受 Anthropic [Claude Code](https://github.com/anthropics/claude-code) 和 [nano-claude-code](https://github.com/TIC-DLUT/nano-claude-code) 启发，使用 **TypeScript** 从零开始纯手工打造的轻量级 AI 编码智能体（Agent）。出于安全考虑，不使用 `axios`，而是使用原生 `fetch` API。

## 为什么要"从零手搓"？

现在的 AI 封装库越来越厚重，当 Agent 陷入死循环、工具调用失败、或者上下文丢失时，新手往往不知所措。

作为教学项目，这个项目带你亲自趟过这些坑：

- 亲自手写底层 SDK，搞懂 LLM 接口的 JSON Schema 长什么样。
- 亲自解析 SSE 流式响应，体验在终端打印"打字机"效果的快感。
- 亲自写一个 for 循环来实现 Agent 的"观察 -> 思考 -> 行动"（ReAct）闭环。
- 亲自赋予 LLM 读写本地文件和执行 Bash 命令的危险而强大的能力。
- 亲自设计并实现会话持久化与多会话，给 Agent"记忆"。

## QuickStart

```shell
git clone https://github.com/TIC-DLUT/nano-claude-code-typescript.git
cd .\nano-claude-code-typescript\
code .
```

```shell
# 首次：安装依赖 + 配置 .env（填入 CLAUDE_API_KEY / CLAUDE_BASE_URL）
pnpm install

# 运行
pnpm start                # 单次对话：tsx index.ts chat "Hello, Claude!"
pnpm repl                 # 交互式 REPL
pnpm cli                  # 查看 CLI 用法
pnpm cli:dist             # 使用构建后的 dist 运行
```

```shell
# 常用命令
npx tsx index.ts doctor          # 校验本地配置与工具初始化
npx tsx index.ts tools list      # 列出已注册工具
npx tsx index.ts chat "你好"      # 单次对话
npx tsx index.ts repl            # 进入交互式 REPL
```

## 项目结构（自底向上的分层）

```
src/
├── types/     ① 类型层：request / response / tools / client / common
├── llm/       ② 底层 SDK：httpClient / call / client
├── models/    ③ 数据模型：message / conversation / registry
├── config/    ④ 配置：init（读取 .env）
├── tools/     ⑤ 工具系统：tool / registry / toolManager / execute / schemas / handlers
├── agent/     ⑥ Agent 循环：prompt / toolLoop / runner / init
├── errors/    ⑦ 错误处理：cliError
└── cli/       ⑧ CLI 层：main / commands / handlers / printer / repl / session
```

---

## 项目是如何一步步构建的？

下面是**按依赖先后顺序**的构建路径。每一层只依赖它下面的层，逻辑自底向上逐步变厚。

### Step 1 · 手写类型定义（`src/types/`）
**逻辑**：不直接用任何 SDK，先把 Claude Messages API 的「请求体 / 响应体 / 工具 / 请求头」用 TypeScript 类型精确刻画出来。

- `request.ts`：`RequestBody`、`MessageParam`、`SystemContentBlock`、`tool_choice` 等
- `response.ts`：`ResponseBody`、`ContentBlock`（text / thinking / tool_use / tool_result / server_tool_use / unknown 兜底）
- `tools.ts`：`ClientTool` / `ServerTool`
- `client.ts`、`common.ts`：客户端配置、`CacheControl`

**为什么先做**：类型是"地基"。先把 API 形状定清楚，后续所有层都能获得类型安全，避免写代码时瞎猜字段。

### Step 2 · 原生 fetch 的 HTTP 客户端（`src/llm/httpClient.ts`）
**逻辑**：封装基于原生 `fetch` 的 POST / GET / 流式 POST，统一处理 URL 拼接、请求超时（`AbortController`）、非 2xx 错误抛出。

**为什么**：这是"离网络最近"的一层。因为安全考虑不用 `axios`，所以手写 fetch 封装，为上层提供干净的调用入口。

### Step 3 · 封装 API 调用（`src/llm/call.ts` → `src/llm/client.ts`）
**逻辑**：
- `ClaudeCall` 负责构造请求头（`x-api-key` / `anthropic-version` / `Authorization` 等）、拼接 `/v1/messages` 端点、调用 `HttpClient`、把响应写回会话。
- `ClaudeClient` 是门面（Facade）：提供 `call()`（非流式）与 `callStream()`（流式）两个公开方法，内部做 URL 规范化、模型解析、默认会话管理。

**为什么**：`ClaudeClient` 让上层使用者不关心底层细节，只调用 `call / callStream`。这是"SDK 层"的完整形态。

### Step 4 · SSE 流式解析（`src/llm/call.ts` 的 `callClaudeStream`）
**逻辑**：逐行解析 `text/event-stream`，处理 `message_start` / `content_block_start` / `content_block_delta` / `content_block_stop` / `message_delta` / `message_stop` 等事件，把分片的文本累积起来，并在流结束后把完整 assistant 消息写回会话，实现终端"打字机"效果。

**为什么**：流式是 Agent 交互体验的关键。这里把"网络字节流"翻译成"结构化消息"。

### Step 5 · 数据模型 Message / Conversation（`src/models/`）
**逻辑**：
- `Message`：一条 user/assistant 消息，内容为字符串或 content block 数组。
- `Conversation`：内存中的会话容器，维护 `history`（消息列表）与 `rawResponses`（原始响应），并提供提取文本的方法。
- `registry.ts`：`ModelRegistry` 白名单，防止使用未授权的模型。

**为什么**：Agent 是有状态的。`Conversation` 承担"运行时记忆"，是后续 ToolLoop 与持久化的载体。

### Step 6 · 工具系统（`src/tools/`）
**逻辑**：
- `schemas/`：每个工具的 JSON Schema（`weather` / `read_file` / `write_file` / `edit_file` / `bash`）。
- `handlers/`：每个工具的执行逻辑。
- `registry.ts` / `toolManager.ts`：工具注册表与增删查。
- `execute.ts`：按工具名找到 handler 并执行。
- `init.ts`：一次性注册全部内置工具。

**为什么**：这是"给模型双手"。读写文件与执行命令让 Agent 真正具备行动力，同时通过 schema 约束输入。

### Step 7 · Agent 循环 runToolLoop（`src/agent/toolLoop.ts`）
**逻辑**：用 `for` 循环实现 ReAct 闭环：**调用 LLM → 观察返回里的 `tool_use` 块 → 执行工具 → 把 `tool_result` 回传 → 继续下一轮**，直到没有工具调用或达到 `maxTurns`。

关键点：
- 第一轮用初始 `tool_choice`，之后切回 `auto`，避免死循环。
- 工具执行失败也会作为 `is_error: true` 的 `tool_result` 回传，让模型知道出错。

**为什么**：这是"Agent 的灵魂"。用最朴素的 for 循环讲清楚 ReAct 原理，不加任何框架魔法。

### Step 8 · runner 组装（`src/agent/runner.ts` + `prompt.ts` + `init.ts`）
**逻辑**：把上面所有零件组装成可用的 `Agent`：
- `prompt.ts`：构建系统提示词（注入时间、工作目录）。
- `runner.ts`：`createRunner()` 产出 `{ run, runStream }`，负责拼装 `RequestBody`、解析工具、设置默认参数、驱动 ToolLoop。
- `init.ts`：`initAgent()` 一站式完成「读配置 → 初始化工具 → 建客户端 → 建 runner」。

**为什么**：这是面向使用者的统一入口，之后 CLI 只需要调用 `initAgent()`。

### Step 9 · CLI 层（`src/cli/`）
**逻辑**：
- `main.ts`：用 `commander` 注册 `chat` / `repl` / `tools list` / `doctor` 四个命令，读取版本号。
- `commands/` + `handlers/`：命令定义与具体实现分离。
- `printer.ts`：统一输出（文本 / JSON 两种格式，含 info/warn/error/debug/assistant）。
- `repl.ts`：基于 `readline` 的交互界面，支持 `/help /tools /stream /reset /session /exit`。

**为什么**：让 Agent 从"库"变成"可交互的命令行工具"。

### Step 10 · 会话持久化与多会话（`src/models/conversation.ts` + `src/cli/session.ts`）
**逻辑**：
- `Conversation` 增加 `toJSON()` / `fromJSON()`，把内存会话序列化/反序列化。
- `FileSessionStorage`：把会话写成 `.nano-claude/history/<id>.json`。
- `FileSessionStore` + `SessionManager`：按 id 管理多个会话，支持创建/切换/列出。
- REPL 接入：启动时恢复历史、对话后自动保存、退出前保存。

**为什么**：这是"给 Agent 记忆"。`Conversation` 只负责内存中的状态，`Session` 负责跨进程持久化。

### Step 11 · 统一错误处理与工程化（`src/errors/cliError.ts` + 工具链）
**逻辑**：
- `CliError`：携带退出码的错误类；`toCliExit()`：把任意未知错误统一映射为 `{ message, code }`。
- 所有 CLI handler 与 `index.ts` 入口统一用 `toCliExit` 处理错误，`process.exitCode` 不再硬编码。
- 统一相对导入扩展名为 `.js`（ESM / NodeNext 规范）；`tsconfig` / `tsup` / `vitest` 配置齐备。

**为什么**：让错误处理集中、可测试，退出码可精确控制，工程上更健壮。

---

## 已实现的功能 ✅

### 底层 SDK
- ✅ 原生 `fetch` 的 HTTP 客户端（含请求超时、错误抛出）
- ✅ `ClaudeClient` 门面：`call()` 非流式 / `callStream()` 流式
- ✅ 完整 SSE 流式解析（打字机效果 + 结构化还原）
- ✅ 模型白名单校验（`ModelRegistry`）

### 数据模型
- ✅ `Message` / `Conversation`（内存会话、文本提取、`toJSON/fromJSON` 序列化）

### 工具系统
- ✅ 工具注册表 / 管理器 / 执行器
- ✅ 内置 5 个工具：`weather`、`read_file`、`write_file`、`edit_file`、`bash`

### Agent
- ✅ ReAct 工具循环（`runToolLoop`：观察 → 思考 → 行动）
- ✅ `tool_choice` 控制、自动回退 `auto`、`maxTurns` 上限
- ✅ 系统提示词构建、runner 统一组装

### CLI
- ✅ 四个命令：`chat` / `repl` / `tools list` / `doctor`
- ✅ 文本 / JSON 两种输出格式（`printer`）
- ✅ REPL：`/help /tools /stream /reset /session /exit`

### 记忆与健壮性
- ✅ 会话持久化（磁盘存储、启动恢复、对话后自动保存）
- ✅ 多会话（创建 / 切换 / 列出）
- ✅ 全局错误处理（`CliError` / `toCliExit`，精确退出码）
- ✅ 单元测试（client / runner / toolLoop / session / cliError，共 16 个）

---

## 未实现的功能（Roadmap）❌

以下来自项目愿景，目前**尚未实现**，属于后续规划：

- ❌ **TODO 架构的 Agent**：任务拆解与规划
- ❌ **subAgents 架构**：子 Agent 委派
- ❌ **Skills 框架**：技能的加载与调用
- ❌ **上下文压缩机制**：长对话压缩
- ❌ **Tasks 系统**：任务依赖与规划
- ❌ **Background Tasks 机制**：后台任务
- ❌ **多智能体架构**：多 Agent 协作
- ❌ **对话记录的更多增强**：例如按会话的时间/标题管理、导入导出等（基础的磁盘持久化已实现）

---

## 其他版本

- [nano-claude-code](https://github.com/TIC-DLUT/nano-claude-code)
- [nano-claude-code-python](https://github.com/TIC-DLUT/nano-claude-code-python)

## 贡献

由于这是一个教学项目，非常欢迎各位参与进来！

[详细贡献指南](./CONTRIBUTING.md)

