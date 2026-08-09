# 晓林英语

一个面向个人长期使用的英语单词学习站。项目按「由易到难」组织 12 本词书，保存每个单词的学习状态，并可用千问按需生成结构化学习卡片。前端、API、静态资源与数据库均部署在 Cloudflare 上。

## 已实现

- 12 本词书、18,448 个去重单词，按基础词汇到 GRE 排序
- 三种学习状态：未学习、学习中、已学会
- 「学习中」专属复习词库
- 密码登录与 30 天签名会话，用于识别唯一使用者并保存进度
- 词书切换、单词搜索、发音、下一个单词、进度统计
- 千问 `qwen3.8-max` 按需生成学习内容，并缓存到 D1，避免重复调用
- 登录限流、写请求 Origin 校验、HttpOnly/Secure/SameSite Cookie
- 桌面与移动端响应式界面

## 技术架构

- React 19 + Vite
- Cloudflare Workers + Static Assets
- Cloudflare D1
- 阿里云百炼 OpenAI 兼容接口

```text
浏览器
  ├─ 静态页面 ───────────────→ Cloudflare Static Assets
  └─ /api/* ────────────────→ Cloudflare Worker
                                  ├─ 登录 / 进度 / AI 缓存 → D1
                                  └─ 学习卡片生成 ─────────→ Qwen API
```

## 本地开发

要求 Node.js 20 或更高版本。

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run dev:worker
```

打开 <http://localhost:8787>。如果只需要查看前端设计，可运行 `npm run dev`；Vite 环境会自动使用演示数据。

`.dev.vars` 中需要配置：

```dotenv
APP_PASSWORD=你的访问密码
SESSION_SECRET=至少32位的随机字符串
DASHSCOPE_API_KEY=你的百炼API_KEY
```

不要提交 `.dev.vars`。仓库只包含安全的 `.dev.vars.example`。

## Cloudflare 首次部署

项目已绑定 D1 数据库 `f9ec4729-dc30-4427-a771-9ebaf29ede2d`。先登录 Cloudflare、初始化远程数据库并部署：

```bash
npx wrangler login
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

部署完成后配置三个加密 Secret：

```bash
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put DASHSCOPE_API_KEY
```

也可以在 Cloudflare 后台的 Worker 设置中添加同名 Secret。`SESSION_SECRET` 应为至少 32 位的随机字符串。Secret 未配置完成前，生产站点会安全地保持关闭，不会进入演示模式。

配置完成后无需重新构建代码；刷新网站即可登录。Wrangler 后续部署不会删除已配置的加密 Secret。

`wrangler.jsonc` 已将 `english.thus.chat` 配置为自定义域名。部署账号需要拥有该域名所在 Cloudflare Zone 的权限。

### 千问区域配置

默认配置使用新加坡国际站旧版兼容地址：

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

如果你的 API Key 属于中国内地、美国或新加坡 Workspace，请按照[阿里云百炼官方文档](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)把 `DASHSCOPE_BASE_URL` 改成对应 Workspace endpoint。模型默认使用 `qwen3.8-max`。

## GitHub Actions

`.github/workflows/deploy.yml` 提供手动部署工作流。首次初始化新数据库时勾选 `seed_database`；后续发布保持关闭即可。需要在 GitHub 仓库 Secrets 中配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

应用自身的三个 Secret 仍建议使用 `wrangler secret put` 直接保存在 Cloudflare，不要放进仓库。

## 数据来源

词书的单词、排序、音标、词性与简短释义来自 `kajweb/dict`，该项目由原需求中的 `SteveSuv/remix-words-funny` README 引用。完整来源与许可证说明见 [ATTRIBUTION.md](./ATTRIBUTION.md)。

可使用以下命令从上游词书重新生成导入迁移：

```bash
node scripts/build-vocabulary-migration.mjs /path/to/kajweb-dict
```

## 验证

```bash
npm run check
npm run build:cloudflare
```

安全模型与运维建议见 [SECURITY.md](./SECURITY.md)。
