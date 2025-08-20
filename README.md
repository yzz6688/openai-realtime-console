# OpenAI 实时控制台

这是一个示例应用程序，展示如何使用 [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) 配合 [WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc)。

## 安装和使用

开始之前，您需要一个 OpenAI API 密钥 - [在此处的仪表板中创建一个](https://platform.openai.com/settings/api-keys)。从示例文件创建一个 `.env` 文件并在其中设置您的 API 密钥：

```bash
cp .env.example .env
```

本地运行此应用程序需要安装 [Node.js](https://nodejs.org/)。使用以下命令安装应用程序依赖项：

```bash
npm install
```

使用以下命令启动应用程序服务器：

```bash
npm run dev
```

这应该会在 [http://localhost:3000](http://localhost:3000) 上启动控制台应用程序。

此应用程序是一个最小模板，使用 [express](https://expressjs.com/) 来提供包含在 [`/client`](./client) 文件夹中的 React 前端。服务器配置为使用 [vite](https://vitejs.dev/) 来构建 React 前端。

此应用程序展示了如何通过 WebRTC 数据通道发送和接收 Realtime API 事件，以及配置客户端函数调用。您还可以使用 UI 中的日志面板查看客户端和服务器事件的 JSON 负载。

如需更全面的示例，请参阅使用 Next.js 构建的 [OpenAI Realtime Agents](https://github.com/openai/openai-realtime-agents) 演示，该演示使用了受 [OpenAI Swarm](https://github.com/openai/swarm) 启发的代理架构。

## 之前的 WebSockets 版本

此应用程序之前使用客户端 WebSockets 的版本（不推荐在浏览器中使用）[可在此处找到](https://github.com/openai/openai-realtime-console/tree/websockets)。

## 许可证

MIT
