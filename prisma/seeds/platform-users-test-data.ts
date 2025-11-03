/**
 * 平台用户表独立测试数据生成器
 * 
 * 功能：
 * - 独立为 PlatformUser 表生成测试数据
 * - 支持批量创建指定数量的平台用户
 * - 支持多种会议平台（腾讯会议、Zoom、飞书等）
 * - 支持清理测试平台用户数据
 * - 可选关联到本地 User 表
 * 
 * @author 杨仕明 shiming.y@qq.com
 * @copyright 2025
 */

import { PrismaClient, $Enums } from '@prisma/client'

const prisma = new PrismaClient()

// ==================== 配置常量 ====================

const TEST_PLATFORM_USER_PREFIX = 'test_platform_user_' // 测试平台用户前缀
const COUNTRY_CODE = '+86'

// 姓氏和名字池
const LAST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗']
const FIRST_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞']

// 英文名字池（用于国际平台）
const ENGLISH_FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
const ENGLISH_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

// 会议平台列表
const PLATFORMS = [
  $Enums.MeetingPlatform.TENCENT_MEETING,
  $Enums.MeetingPlatform.ZOOM,
  $Enums.MeetingPlatform.FEISHU,
  $Enums.MeetingPlatform.DINGTALK,
  $Enums.MeetingPlatform.TEAMS,
  $Enums.MeetingPlatform.WEBEX,
]

// 平台特定配置
const PLATFORM_CONFIGS = {
  [String($Enums.MeetingPlatform.TENCENT_MEETING)]: {
    name: '腾讯会议',
    useChineseName: true,
    idPrefix: 'tm_',
    emailDomain: 'meeting.tencent.com',
  },
  [String($Enums.MeetingPlatform.ZOOM)]: {
    name: 'Zoom',
    useChineseName: false,
    idPrefix: 'zoom_',
    emailDomain: 'zoom.us',
  },
  [String($Enums.MeetingPlatform.FEISHU)]: {
    name: '飞书',
    useChineseName: true,
    idPrefix: 'fs_',
    emailDomain: 'feishu.cn',
  },
  [String($Enums.MeetingPlatform.DINGTALK)]: {
    name: '钉钉',
    useChineseName: true,
    idPrefix: 'dt_',
    emailDomain: 'dingtalk.com',
  },
  [String($Enums.MeetingPlatform.TEAMS)]: {
    name: 'Teams',
    useChineseName: false,
    idPrefix: 'teams_',
    emailDomain: 'teams.microsoft.com',
  },
  [String($Enums.MeetingPlatform.WEBEX)]: {
    name: 'Webex',
    useChineseName: false,
    idPrefix: 'webex_',
    emailDomain: 'webex.com',
  },
}

// ==================== 工具函数 ====================

/**
 * 随机选择数组中的元素
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * 生成随机中文姓名
 */
function generateChineseName(): { fullName: string; firstName: string; lastName: string } {
  const lastName = randomChoice(LAST_NAMES)
  const firstName = randomChoice(FIRST_NAMES)
  return {
    fullName: `${lastName}${firstName}`,
    firstName,
    lastName,
  }
}

/**
 * 生成随机英文姓名
 */
function generateEnglishName(): { fullName: string; firstName: string; lastName: string } {
  const firstName = randomChoice(ENGLISH_FIRST_NAMES)
  const lastName = randomChoice(ENGLISH_LAST_NAMES)
  return {
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
  }
}

/**
 * 生成平台用户ID
 */
function generatePlatformUserId(platform: $Enums.MeetingPlatform, index: number): string {
  const config = PLATFORM_CONFIGS[String(platform)]
  return `${config.idPrefix}${TEST_PLATFORM_USER_PREFIX}${index}_${Date.now()}`
}

/**
 * 生成邮箱
 */
function generateEmail(platform: $Enums.MeetingPlatform, index: number): string {
  const config = PLATFORM_CONFIGS[String(platform)]
  return `${TEST_PLATFORM_USER_PREFIX}${index}@${config.emailDomain}`
}

/**
 * 生成手机号
 */
function generatePhone(index: number): string {
  const base = 13900000000
  return (base + index).toString()
}

/**
 * 生成手机号哈希（模拟腾讯会议加密）
 */
function generatePhoneHash(phone: string): string {
  // 简单的哈希模拟，实际应该使用真实的加密算法
  return Buffer.from(phone).toString('base64')
}

/**
 * 生成平台特定数据
 */
function generatePlatformData(platform: $Enums.MeetingPlatform, index: number): any {
  const baseData = {
    createdAt: new Date().toISOString(),
    testUser: true,
    index,
  }

  switch (platform) {
    case $Enums.MeetingPlatform.TENCENT_MEETING:
      return {
        ...baseData,
        instanceId: 1000000 + index,
        userRole: Math.random() > 0.5 ? 1 : 0, // 0: 普通成员, 1: 主持人
      }
    
    case $Enums.MeetingPlatform.ZOOM:
      return {
        ...baseData,
        accountId: `acc_${index}`,
        pmi: 1000000000 + index, // Personal Meeting ID
        timezone: 'Asia/Shanghai',
      }
    
    case $Enums.MeetingPlatform.FEISHU:
      return {
        ...baseData,
        openId: `ou_${index}`,
        unionId: `on_${index}`,
        employeeNo: `EMP${String(index).padStart(6, '0')}`,
      }
    
    case $Enums.MeetingPlatform.DINGTALK:
      return {
        ...baseData,
        unionId: `union_${index}`,
        openId: `open_${index}`,
        staffId: `staff_${index}`,
      }
    
    case $Enums.MeetingPlatform.TEAMS:
      return {
        ...baseData,
        objectId: `obj_${index}`,
        tenantId: `tenant_${index}`,
        userPrincipalName: generateEmail(platform, index),
      }
    
    case $Enums.MeetingPlatform.WEBEX:
      return {
        ...baseData,
        personId: `person_${index}`,
        orgId: `org_${index}`,
        sipAddress: `sip_${index}@webex.com`,
      }
    
    default:
      return baseData
  }
}

// ==================== 核心功能 ====================

/**
 * 创建单个测试平台用户
 */
async function createTestPlatformUser(
  platform: $Enums.MeetingPlatform,
  index: number,
  linkToLocalUser: boolean = false
): Promise<void> {
  const config = PLATFORM_CONFIGS[String(platform)]
  const platformUserId = generatePlatformUserId(platform, index)
  const email = generateEmail(platform, index)
  const phone = generatePhone(index)
  
  // 根据平台选择姓名类型
  const name = config.useChineseName ? generateChineseName() : generateEnglishName()
  
  try {
    // 如果需要关联本地用户，先查找或创建
    let userId: string | undefined = undefined
    if (linkToLocalUser) {
      const localUser = await prisma.user.findFirst({
        where: {
          email: {
            startsWith: 'test_user_',
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip: index % 10, // 循环关联到前10个测试用户
      })
      userId = localUser?.id
    }

    const platformUser = await prisma.platformUser.create({
      data: {
        platform,
        platformUserId,
        userName: name.fullName,
        userEmail: email,
        userPhone: phone,
        userId,
        platformData: generatePlatformData(platform, index),
        phoneHash: platform === $Enums.MeetingPlatform.TENCENT_MEETING 
          ? generatePhoneHash(phone) 
          : undefined,
        isActive: true,
        lastSeenAt: new Date(),
      },
    })

    const userLink = userId ? ` (关联用户: ${userId.substring(0, 8)}...)` : ''
    console.log(`✅ 创建平台用户 ${index}: ${config.name} - ${name.fullName} (${email})${userLink}`)
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log(`⚠️  平台用户 ${index} 已存在，跳过: ${platformUserId}`)
    } else {
      console.error(`❌ 创建平台用户 ${index} 失败:`, error.message)
    }
  }
}

/**
 * 批量创建测试平台用户
 */
async function createTestPlatformUsers(
  count: number = 10,
  options: {
    platform?: $Enums.MeetingPlatform
    linkToLocalUser?: boolean
    distributePlatforms?: boolean
  } = {}
): Promise<void> {
  const {
    platform,
    linkToLocalUser = false,
    distributePlatforms = true,
  } = options

  console.log(`\n🚀 开始创建 ${count} 个测试平台用户...`)
  
  if (platform) {
    const config = PLATFORM_CONFIGS[String(platform)]
    console.log(`📱 指定平台: ${config.name}`)
  } else if (distributePlatforms) {
    console.log(`📱 分布式创建: 在 ${PLATFORMS.length} 个平台间均匀分布`)
  }
  
  console.log(`🔗 关联本地用户: ${linkToLocalUser ? '是' : '否'}`)
  console.log(`📧 邮箱前缀: ${TEST_PLATFORM_USER_PREFIX}\n`)

  try {
    // 批量创建用户（使用并发控制）
    const batchSize = 5
    for (let i = 0; i < count; i += batchSize) {
      const batch = []
      for (let j = i; j < Math.min(i + batchSize, count); j++) {
        // 选择平台
        let selectedPlatform: $Enums.MeetingPlatform
        if (platform) {
          selectedPlatform = platform
        } else if (distributePlatforms) {
          selectedPlatform = PLATFORMS[j % PLATFORMS.length]
        } else {
          selectedPlatform = randomChoice(PLATFORMS)
        }
        
        batch.push(createTestPlatformUser(selectedPlatform, j + 1, linkToLocalUser))
      }
      await Promise.all(batch)
    }

    console.log(`\n✅ 测试平台用户创建完成！`)
    console.log(`\n📊 统计信息:`)
    console.log(`   - 目标数量: ${count} 个`)
    console.log(`   - 邮箱前缀: ${TEST_PLATFORM_USER_PREFIX}`)
    console.log(`   - 关联本地用户: ${linkToLocalUser ? '是' : '否'}`)
  } catch (error) {
    console.error('❌ 批量创建测试平台用户失败:', error)
    throw error
  }
}

/**
 * 清理测试平台用户数据
 */
async function cleanTestPlatformUsers(): Promise<void> {
  console.log('\n🧹 开始清理测试平台用户数据...')

  try {
    // 1. 查找所有测试平台用户
    const testPlatformUsers = await prisma.platformUser.findMany({
      where: {
        OR: [
          {
            userEmail: {
              startsWith: TEST_PLATFORM_USER_PREFIX,
            },
          },
          {
            platformUserId: {
              contains: TEST_PLATFORM_USER_PREFIX,
            },
          },
        ],
      },
      select: {
        id: true,
        platform: true,
        userName: true,
        userEmail: true,
      },
    })

    if (testPlatformUsers.length === 0) {
      console.log('ℹ️  没有找到测试平台用户数据')
      return
    }

    console.log(`📋 找到 ${testPlatformUsers.length} 个测试平台用户`)

    // 2. 删除关联的参会记录
    const deletedParticipations = await prisma.meetingParticipation.deleteMany({
      where: {
        platformUserId: {
          in: testPlatformUsers.map(u => u.id),
        },
      },
    })
    console.log(`✅ 删除 ${deletedParticipations.count} 条参会记录`)

    // 3. 删除平台用户
    const deletedPlatformUsers = await prisma.platformUser.deleteMany({
      where: {
        OR: [
          {
            userEmail: {
              startsWith: TEST_PLATFORM_USER_PREFIX,
            },
          },
          {
            platformUserId: {
              contains: TEST_PLATFORM_USER_PREFIX,
            },
          },
        ],
      },
    })
    console.log(`✅ 删除 ${deletedPlatformUsers.count} 个平台用户`)

    console.log('\n🎉 测试平台用户数据清理完成！')
  } catch (error) {
    console.error('❌ 清理测试平台用户失败:', error)
    throw error
  }
}

/**
 * 查看测试平台用户统计信息
 */
async function showTestPlatformUsersStats(): Promise<void> {
  console.log('\n📊 测试平台用户统计信息...')

  try {
    const testPlatformUsers = await prisma.platformUser.findMany({
      where: {
        OR: [
          {
            userEmail: {
              startsWith: TEST_PLATFORM_USER_PREFIX,
            },
          },
          {
            platformUserId: {
              contains: TEST_PLATFORM_USER_PREFIX,
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            participations: true,
            hostedMeetings: true,
          },
        },
      },
      orderBy: [
        { platform: 'asc' },
        { userName: 'asc' },
      ],
    })

    if (testPlatformUsers.length === 0) {
      console.log('ℹ️  当前没有测试平台用户')
      return
    }

    // 按平台分组统计
    const platformStats = new Map<string, number>()
    testPlatformUsers.forEach(user => {
      const count = platformStats.get(user.platform) || 0
      platformStats.set(user.platform, count + 1)
    })

    console.log(`\n📋 共有 ${testPlatformUsers.length} 个测试平台用户:\n`)
    
    // 显示平台分布
    console.log('📱 平台分布:')
    platformStats.forEach((count, platform) => {
      const config = PLATFORM_CONFIGS[platform]
      console.log(`   ${config.name}: ${count} 个`)
    })
    
    console.log('\n👥 用户详情:\n')
    testPlatformUsers.forEach((user, index) => {
      const config = PLATFORM_CONFIGS[user.platform]
      console.log(`${index + 1}. [${config.name}] ${user.userName}`)
      console.log(`   邮箱: ${user.userEmail || '未设置'}`)
      console.log(`   手机: ${user.userPhone || '未设置'}`)
      console.log(`   平台ID: ${user.platformUserId}`)
      console.log(`   关联用户: ${user.user?.email || '未关联'}`)
      console.log(`   参会次数: ${user._count.participations}`)
      console.log(`   主持会议: ${user._count.hostedMeetings}`)
      console.log(`   状态: ${user.isActive ? '活跃' : '不活跃'}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error)
    throw error
  }
}

// ==================== 命令行接口 ====================

/**
 * 显示使用帮助
 */
function showHelp(): void {
  console.log(`
📖 平台用户测试数据生成器使用说明

命令格式:
  tsx prisma/seeds/platform-users-test-data.ts [命令] [参数]

可用命令:
  create [数量] [选项]  - 创建指定数量的测试平台用户（默认10个）
  clean                - 清理所有测试平台用户数据
  stats                - 查看测试平台用户统计信息
  help                 - 显示此帮助信息

创建命令选项:
  --platform=<平台>    - 指定平台（TENCENT_MEETING, ZOOM, FEISHU, DINGTALK, TEAMS, WEBEX）
  --link-user          - 关联到本地测试用户
  --no-distribute      - 不分布式创建（随机选择平台）

使用示例:
  # 创建20个平台用户，在各平台间均匀分布
  tsx prisma/seeds/platform-users-test-data.ts create 20

  # 创建10个腾讯会议用户
  tsx prisma/seeds/platform-users-test-data.ts create 10 --platform=TENCENT_MEETING

  # 创建30个用户并关联到本地用户
  tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user

  # 创建50个Zoom用户并关联本地用户
  tsx prisma/seeds/platform-users-test-data.ts create 50 --platform=ZOOM --link-user

  # 清理所有测试平台用户
  tsx prisma/seeds/platform-users-test-data.ts clean

  # 查看统计信息
  tsx prisma/seeds/platform-users-test-data.ts stats

支持的平台:
  - TENCENT_MEETING (腾讯会议)
  - ZOOM
  - FEISHU (飞书)
  - DINGTALK (钉钉)
  - TEAMS (Microsoft Teams)
  - WEBEX (Cisco Webex)

测试用户特征:
  - 邮箱前缀: ${TEST_PLATFORM_USER_PREFIX}
  - 自动生成平台特定数据
  - 可选关联到本地 User 表
  `)
}

/**
 * 解析命令行参数
 */
function parseArgs(args: string[]): {
  platform?: $Enums.MeetingPlatform
  linkToLocalUser: boolean
  distributePlatforms: boolean
} {
  const options = {
    platform: undefined as $Enums.MeetingPlatform | undefined,
    linkToLocalUser: false,
    distributePlatforms: true,
  }

  args.forEach(arg => {
    if (arg.startsWith('--platform=')) {
      const platformValue = arg.split('=')[1] as $Enums.MeetingPlatform
      if (Object.values($Enums.MeetingPlatform).includes(platformValue)) {
        options.platform = platformValue
      } else {
        console.error(`❌ 无效的平台: ${platformValue}`)
        process.exit(1)
      }
    } else if (arg === '--link-user') {
      options.linkToLocalUser = true
    } else if (arg === '--no-distribute') {
      options.distributePlatforms = false
    }
  })

  return options
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'

  try {
    switch (command) {
      case 'create': {
        const count = parseInt(args[1]) || 10
        if (count <= 0 || count > 1000) {
          console.error('❌ 用户数量必须在 1-1000 之间')
          process.exit(1)
        }
        
        const options = parseArgs(args.slice(2))
        await createTestPlatformUsers(count, options)
        break
      }

      case 'clean':
        await cleanTestPlatformUsers()
        break

      case 'stats':
        await showTestPlatformUsersStats()
        break

      case 'help':
      default:
        showHelp()
        break
    }
  } catch (error) {
    console.error('❌ 执行失败:', error)
    process.exit(1)
  }
}

// ==================== 程序入口 ====================

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}

// 导出函数供其他模块使用
export { createTestPlatformUsers, cleanTestPlatformUsers, showTestPlatformUsersStats }
