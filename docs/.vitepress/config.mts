import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
  ignoreDeadLinks: false,
  lang: 'zh-CN',
  title: 'Nove API',
  description: 'Nove API 项目文档 — 面向 AI 时代的企业级智能数据仓库与 Agent 基础设施',

  // 根目录是 docs/，所以不需要 srcDir
  // 根目录有 index.md 负责首页

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],

  lastUpdated: true,

  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', alt: 'Nove API' },

    siteTitle: 'Nove API',

    nav: [
      { text: '首页', link: '/' },
      { text: '开发者文档', link: '/developer/', activeMatch: '/developer/' },
      { text: '用户文档', link: '/user/', activeMatch: '/user/' },
    ],

    sidebar: {
      '/developer/': [
        {
          text: '开发者文档',
          items: [
            { text: '概述', link: '/developer/' },
          ],
        },
        {
          text: '🏗️ 架构设计',
          collapsed: false,
          items: [
            { text: '架构索引', link: '/developer/architecture/' },
            { text: '整体架构', link: '/developer/architecture/overview' },
            { text: '技术栈', link: '/developer/architecture/tech-stack' },
            { text: '数据流设计', link: '/developer/architecture/data-flow' },
            { text: '模块地图', link: '/developer/architecture/module-map' },
            { text: '项目结构', link: '/developer/architecture/project-structure' },
          ],
        },
        {
          text: '📖 开发指南',
          collapsed: false,
          items: [
            { text: '指南索引', link: '/developer/guides/' },
            {
              text: '数据库配置',
              collapsed: true,
              items: [
                { text: 'Prisma 配置', link: '/developer/guides/database/prisma-setup' },
                { text: '数据库规范', link: '/developer/guides/database/style-guide' },
              ],
            },
            {
              text: '部署配置',
              collapsed: true,
              items: [
                { text: '部署概述', link: '/developer/guides/deployment/overview' },
                { text: '部署指南', link: '/developer/guides/deployment/guide' },
              ],
            },
            { text: 'Git 协作', link: '/developer/guides/development/git-collaboration' },
            { text: '脚本说明', link: '/developer/guides/development/package-scripts' },
            { text: '测试规范', link: '/developer/guides/development/nestjs-testing-standards' },
            { text: '安全规范', link: '/developer/guides/development/security' },
            { text: '版本控制', link: '/developer/guides/development/version-control' },
            { text: '文档维护', link: '/developer/guides/documentation' },
          ],
        },
        {
          text: '🧩 核心模块',
          collapsed: false,
          items: [
            { text: '模块索引', link: '/developer/modules/' },
            {
              text: '认证模块',
              collapsed: true,
              items: [
                { text: '认证概述', link: '/developer/modules/authentication/overview' },
                { text: '注册流程', link: '/developer/modules/authentication/registration-flow' },
                { text: '登出实现', link: '/developer/modules/authentication/logout-implementation' },
              ],
            },
            {
              text: 'API Key 模块',
              collapsed: true,
              items: [
                { text: '概述', link: '/developer/modules/api-key/overview' },
                { text: '使用示例', link: '/developer/modules/api-key/examples' },
                { text: '变更日志', link: '/developer/modules/api-key/changelog' },
              ],
            },
            {
              text: 'MCP',
              collapsed: true,
              items: [
                { text: '连接指南', link: '/developer/modules/mcp/connection-guide' },
              ],
            },
            {
              text: '组织与成员',
              collapsed: true,
              items: [
                { text: '模块概述', link: '/developer/modules/org-management/overview' },
              ],
            },
            {
              text: '系统配置',
              collapsed: true,
              items: [
                { text: '全局配置', link: '/developer/modules/system-config/overview' },
              ],
            },
          ],
        },
        {
          text: '🔌 第三方集成',
          collapsed: false,
          items: [
            { text: '集成索引', link: '/developer/integrations/' },
            {
              text: '飞书集成',
              collapsed: true,
              items: [
                { text: '集成概述', link: '/developer/integrations/lark/overview' },
                { text: '集成总结', link: '/developer/integrations/lark/summary' },
                { text: 'Webhook 集成', link: '/developer/integrations/lark/webhook/integration' },
                {
                  text: '多维表格',
                  collapsed: true,
                  items: [
                    { text: '批量操作', link: '/developer/integrations/lark/bitable/batch-operations' },
                    { text: 'Upsert 指南', link: '/developer/integrations/lark/bitable/upsert-guide' },
                    { text: 'Upsert 操作', link: '/developer/integrations/lark/bitable/upsert-operations' },
                    { text: '测试指南', link: '/developer/integrations/lark/bitable/testing-guide' },
                    { text: '详细测试指南', link: '/developer/integrations/lark/bitable/testing-guide-detailed' },
                    { text: '录制文件表', link: '/developer/integrations/lark/bitable/recording-file-table' },
                  ],
                },
              ],
            },
            {
              text: '腾讯会议集成',
              collapsed: true,
              items: [
                { text: '集成概述', link: '/developer/integrations/tencent-meeting/overview' },
                { text: 'Webhook 处理', link: '/developer/integrations/tencent-meeting/webhook' },
                { text: 'Webhook 测试', link: '/developer/integrations/tencent-meeting/webhook-testing' },
              ],
            },
            {
              text: '其他集成',
              collapsed: true,
              items: [
                { text: '阿里云短信', link: '/developer/integrations/aliyun/sms-setup' },
                { text: '邮件服务', link: '/developer/integrations/email/api' },
              ],
            },
          ],
        },
        {
          text: '📚 参考资料',
          collapsed: true,
          items: [
            { text: '参考索引', link: '/developer/reference/' },
            { text: '腾讯会议 API 与样本', link: '/developer/reference/tencent-meeting/' },
          ],
        },
        {
          text: '🗺️ 路线图',
          items: [
            { text: '路线图索引', link: '/developer/roadmap/' },
            { text: '项目愿景与目标', link: '/developer/roadmap/project-goals' },
            { text: '多租户架构', link: '/developer/roadmap/multi-tenant-architecture' },
            { text: '会议插件系统', link: '/developer/roadmap/meeting-plugin-system' },
          ],
        },
      ],

      '/user/': [
        {
          text: '用户文档',
          items: [
            { text: '概述', link: '/user/' },
          ],
        },
        {
          text: '🚀 快速开始',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/user/getting-started/quick-start' },
            { text: '用户指南', link: '/user/getting-started/user-guide' },
          ],
        },
        {
          text: '📖 API 使用指南',
          collapsed: false,
          items: [
            { text: 'API 接口文档总览', link: '/user/api/' },
          ],
        },
        {
          text: '❓ 常见问题',
          collapsed: false,
          items: [
            { text: '常见问题解答', link: '/user/faq/common-questions' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lulabs-org' },
    ],

    editLink: {
      pattern: 'https://github.com/lulabs-org/nove-api/edit/develop/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    footer: {
      message: '基于 MIT 协议发布',
      copyright: 'Copyright © 2024-2026 LuLab',
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                },
              },
            },
          },
        },
      },
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    langMenuLabel: '多语言',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
  mermaid: {
    // refer to https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults
  },
})
)
