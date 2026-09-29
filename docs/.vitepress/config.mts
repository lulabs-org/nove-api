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
        { text: '🏗️ 架构设计', link: '/developer/architecture/', activeMatch: '/developer/architecture/' },
        { text: '📖 开发指南', link: '/developer/guides/', activeMatch: '/developer/guides/' },
        { text: '🧩 核心模块', link: '/developer/modules/', activeMatch: '/developer/modules/' },
        { text: '🔌 第三方集成', link: '/developer/integrations/', activeMatch: '/developer/integrations/' },
        { text: '🗺️ 路线图', link: '/developer/roadmap/', activeMatch: '/developer/roadmap/' },
        { text: '👤 用户指南', link: '/user/', activeMatch: '/user/' },
      ],

      sidebar: {
        '/developer/architecture/': [
          {
            text: '🏗️ 架构设计',
            items: [
              { text: '架构索引', link: '/developer/architecture/' },
              { text: '整体架构设计', link: '/developer/architecture/overview' },
              { text: '技术栈与基础设施', link: '/developer/architecture/tech-stack' },
              { text: '核心数据流转', link: '/developer/architecture/data-flow' },
              { text: '模块全景地图', link: '/developer/architecture/module-map' },
              { text: '工程目录结构', link: '/developer/architecture/project-structure' },
            ],
          },
        ],

        '/developer/guides/': [
          {
            text: '📖 开发与工程指南',
            items: [
              { text: '指南索引', link: '/developer/guides/' },
            ],
          },
          {
            text: '团队协作与工程规范',
            collapsed: false,
            items: [
              { text: 'Trunk-Based Git 协作', link: '/developer/guides/collaboration/git' },
              { text: '版本控制与发布', link: '/developer/guides/collaboration/version-control' },
              { text: 'NestJS 测试规范', link: '/developer/guides/collaboration/testing' },
              { text: '工程脚本说明', link: '/developer/guides/collaboration/scripts' },
              { text: '安全开发规范', link: '/developer/guides/collaboration/security' },
              { text: '文档维护指南', link: '/developer/guides/collaboration/documentation' },
            ],
          },
          {
            text: '数据存储与持久化',
            collapsed: false,
            items: [
              { text: 'Prisma 7 配置', link: '/developer/guides/database/prisma-setup' },
              { text: '数据库开发规范', link: '/developer/guides/database/style-guide' },
            ],
          },
          {
            text: '部署与运维',
            collapsed: false,
            items: [
              { text: '部署概览', link: '/developer/guides/deployment/overview' },
              { text: '生产部署指南', link: '/developer/guides/deployment/guide' },
            ],
          },
        ],

        '/developer/modules/': [
          {
            text: '🧩 核心业务模块',
            items: [
              { text: '模块全景索引', link: '/developer/modules/' },
            ],
          },
          {
            text: '🎙️ 会议与 AI 纪要体系',
            collapsed: false,
            items: [
              { text: '会议核心 (Meeting)', link: '/developer/modules/meeting/overview' },
              { text: '会议组织归属基础', link: '/developer/modules/meeting/organization-foundation' },
              { text: '纪要与 AI 总结 (Minute)', link: '/developer/modules/meeting/minute' },
              { text: '追踪报告 (Tracking Report)', link: '/developer/modules/meeting/tracking-report' },
            ],
          },
          {
            text: '🔐 身份认证与权限 (IAM)',
            collapsed: false,
            items: [
              { text: '认证模块概述', link: '/developer/modules/iam/overview' },
              { text: '注册与邀请流程', link: '/developer/modules/iam/registration-flow' },
              { text: '登出实现机制', link: '/developer/modules/iam/logout-implementation' },
              { text: '联系方式换绑审计', link: '/developer/modules/iam/contact-change-audit' },
              { text: 'API Key 鉴权体系', link: '/developer/modules/iam/api-key' },
              { text: 'OAuth 客户端管理', link: '/developer/modules/iam/oauth' },
              { text: '组织与成员管理', link: '/developer/modules/iam/organization' },
            ],
          },
          {
            text: '🤖 智能体与资产基础设施',
            collapsed: false,
            items: [
              { text: '系统技能 (Skill)', link: '/developer/modules/agent/skill' },
              { text: '多项目管理 (Project)', link: '/developer/modules/agent/project' },
              { text: '云盘与 Minute 文件', link: '/developer/modules/agent/drive' },
              { text: 'MCP 协议连接指南', link: '/developer/modules/agent/mcp' },
            ],
          },
          {
            text: '💰 商业与交易结算',
            collapsed: false,
            items: [
              { text: '订单与支付结算', link: '/developer/modules/commerce/overview' },
            ],
          },
        ],

        '/developer/integrations/': [
          {
            text: '🔌 第三方集成与消息通道',
            items: [
              { text: '集成全景索引', link: '/developer/integrations/' },
            ],
          },
          {
            text: '🔐 服务集成中心',
            collapsed: false,
            items: [
              { text: '管理后台配置指南', link: '/developer/integrations/service-integrations' },
              { text: '服务集成后端架构', link: '/developer/integrations/architecture' },
            ],
          },
          {
            text: '🤝 协同办公生态',
            collapsed: false,
            items: [
              { text: '腾讯会议总览', link: '/developer/integrations/tencent-meeting/overview' },
              { text: '腾讯会议 Webhook', link: '/developer/integrations/tencent-meeting/webhook' },
              { text: '腾讯会议本地测试', link: '/developer/integrations/tencent-meeting/webhook-testing' },
              { text: '企业微信与 Hermes', link: '/developer/integrations/wecom/overview' },
              { text: '飞书集成总览', link: '/developer/integrations/lark/overview' },
              { text: '飞书 Webhook', link: '/developer/integrations/lark/webhook' },
            ],
          },
          {
            text: '📨 通讯与通知通道',
            collapsed: false,
            items: [
              { text: '邮件通知服务 (Mail)', link: '/developer/integrations/messaging/mail' },
              { text: '短信基础服务 (SMS)', link: '/developer/integrations/messaging/sms' },
              { text: '阿里云短信接入', link: '/developer/integrations/messaging/aliyun-sms' },
            ],
          },
        ],

        '/developer/roadmap/': [
          {
            text: '🗺️ 规划与路线图',
            items: [
              { text: '路线图索引', link: '/developer/roadmap/' },
              { text: '项目愿景与里程碑', link: '/developer/roadmap/project-goals' },
              { text: '多租户架构演进', link: '/developer/roadmap/multi-tenant-architecture' },
              { text: '会议插件系统设计', link: '/developer/roadmap/meeting-plugin-system' },
            ],
          },
        ],

        '/developer/': [
          {
            text: '📌 开发者文档',
            items: [
              { text: '文档概述与定位', link: '/developer/' },
              { text: '🏗️ 架构设计', link: '/developer/architecture/' },
              { text: '📖 开发指南', link: '/developer/guides/' },
              { text: '🧩 核心模块', link: '/developer/modules/' },
              { text: '🔌 第三方集成', link: '/developer/integrations/' },
              { text: '🗺️ 规划路线图', link: '/developer/roadmap/' },
            ],
          },
        ],

        '/user/': [
          {
            text: '👤 用户指南',
            items: [
              { text: '文档总览', link: '/user/' },
            ],
          },
          {
            text: '🚀 快速开始',
            collapsed: false,
            items: [
              { text: '快速开始', link: '/user/getting-started/quick-start' },
              { text: '系统操作指南', link: '/user/getting-started/user-guide' },
            ],
          },
          {
            text: '🌐 接口总览',
            collapsed: false,
            items: [
              { text: 'API 接口文档总览', link: '/user/api/' },
            ],
          },
          {
            text: '❓ 帮助与支持',
            collapsed: false,
            items: [
              { text: '常见问题解答 (FAQ)', link: '/user/faq/common-questions' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/lulabs-org' },
      ],

      editLink: {
        pattern: 'https://github.com/lulabs-org/nove-api/edit/main/docs/:path',
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
    vite: {
      build: {
        chunkSizeWarningLimit: 1500,
      },
    },
    mermaid: {
      // refer to https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults
    },
  })
)
