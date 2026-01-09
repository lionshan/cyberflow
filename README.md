# WXT + Vue 3

This template should help get you started developing with Vue 3 in WXT.

## Recommended IDE Setup

-   [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

# Cyberflow Extension

一个功能强大的 Chrome 扩展，为您提供增强的浏览体验。

## 功能特性

-   🔍 **页面分析** - 智能分析网页内容和结构
-   🎨 **文本高亮** - 快速高亮显示指定文本
-   📸 **一键截图** - 便捷的页面截图功能
-   📊 **数据导出** - 导出页面信息和分析结果
-   ⚙️ **自定义设置** - 个性化配置选项
-   🌙 **主题支持** - 浅色/深色主题切换

## 安装指南

### 开发模式安装

1. 克隆或下载此项目到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹
6. 扩展将出现在扩展列表中

### 生产环境安装

项目完成后可以打包发布到 Chrome Web Store。

## 项目结构

```
Cyberflow-extension/
├── manifest.json          # 扩展配置文件
├── background.js           # 后台脚本
├── content.js             # 内容脚本
├── popup/                 # 弹出窗口
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/               # 设置页面
│   ├── options.html
│   ├── options.css
│   └── options.js
├── styles/                # 样式文件
│   └── content.css
├── icons/                 # 图标文件
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── assets/                # 静态资源
└── README.md
```

## 开发说明

### 技术栈

-   **Manifest V3** - 最新的 Chrome 扩展规范
-   **Vanilla JavaScript** - 原生 JavaScript，无框架依赖
-   **CSS3** - 现代 CSS 特性和动画
-   **Chrome Extension APIs** - 浏览器扩展 API

### 主要组件

#### Background Script (background.js)

-   Service Worker 模式运行
-   处理扩展生命周期事件
-   管理存储和消息传递

#### Content Script (content.js)

-   注入到网页中运行
-   提供页面增强功能
-   与 popup 和 background 通信

#### Popup (popup/)

-   扩展的主界面
-   快速操作和状态显示
-   功能按钮和设置入口

#### Options Page (options/)

-   详细的设置配置界面
-   多 tab 导航结构
-   实时设置保存

### 开发工作流

1. **修改代码** - 编辑相关文件
2. **重新加载扩展** - 在 chrome://extensions/点击刷新
3. **测试功能** - 验证修改效果
4. **调试问题** - 使用开发者工具

### 调试方法

-   **Background Script**: 在扩展管理页面点击"检查视图 service worker"
-   **Content Script**: 在网页上按 F12，查看 Console
-   **Popup**: 右键扩展图标，选择"检查"
-   **Options Page**: 在设置页面按 F12

## API 使用说明

### Storage API

```javascript
// 保存设置
chrome.storage.sync.set({ key: value });

// 读取设置
chrome.storage.sync.get(["key"], (result) => {
    console.log(result.key);
});
```

### Tabs API

```javascript
// 获取当前标签页
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs[0]);
});
```

### Messaging API

```javascript
// 发送消息
chrome.runtime.sendMessage({ action: "getData" });

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 处理消息
});
```

## 自定义功能

### 添加新功能

1. 在相应的 JavaScript 文件中实现功能逻辑
2. 在 popup.html 中添加 UI 控件
3. 在 popup.js 中绑定事件处理器
4. 如需持久化设置，使用 Storage API

### 样式定制

-   修改 `popup/popup.css` 自定义弹出窗口样式
-   修改 `options/options.css` 自定义设置页面样式
-   修改 `styles/content.css` 自定义网页注入样式

## 权限说明

扩展请求的权限：

-   `activeTab` - 访问当前活动标签页
-   `storage` - 存储用户设置
-   `tabs` - 管理浏览器标签页
-   `host_permissions` - 访问所有网站（用于内容注入）

## 发布准备

### 打包扩展

1. 压缩整个项目文件夹为 ZIP 格式
2. 确保包含所有必要文件
3. 检查 manifest.json 配置正确

### Chrome Web Store 发布

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 创建开发者账户
3. 上传 ZIP 包
4. 填写扩展信息
5. 提交审核

## 许可证

MIT License

## 贡献指南

欢迎提交 Issues 和 Pull Requests！

1. Fork 此项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 支持

如有问题或建议，请：

-   创建 Issue
-   发送邮件至开发者
-   查看项目 Wiki

---

**注意**: 这是一个开发模板，请根据实际需求修改和扩展功能。
