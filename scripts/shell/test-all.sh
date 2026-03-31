#!/bin/bash

# LULAB 后端测试运行脚本（基于 pnpm + Jest 多项目）
# 与仓库规范对齐：使用 pnpm 脚本、jest.config.ts、可选覆盖率与 DB 维护

set -euo pipefail

echo "🚀 LULAB Backend Testing Suite"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 帮助信息
show_help() {
  echo "Usage: $0 [OPTIONS] [-- <jest-args>]"
  echo "Options:"
  echo "  -u, --unit            仅运行单元测试"
  echo "  -i, --integration     仅运行集成测试"
  echo "  -e, --e2e             仅运行端到端测试"
  echo "  -s, --system          仅运行系统测试"
  echo "  -a, --all             运行所有测试 (默认)"
  echo "  -w, --watch           以 watch 模式运行（支持 unit/integration/system）"
  echo "  -c, --coverage        生成覆盖率（等同 pnpm test:ci 对 all）"
  echo "      --lint            测试前运行 lint"
  echo "      --reset-db        使用 prisma migrate reset 重置测试数据库（危险）"
  echo "      --seed            在运行测试前执行种子数据"
  echo "      --cleanup         清理覆盖率与测试数据（调用 db:clean）"
  echo "  -h, --help            显示帮助"
  echo ""
  echo "Examples:"
  echo "  $0 --unit --watch"
  echo "  $0 --all --coverage"
  echo "  $0 --integration --reset-db --seed"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}❌ 缺少命令: $1${NC}"
    exit 1
  fi
}

# 环境准备
setup_environment() {
  echo -e "${BLUE}🔍 Checking environment...${NC}"

  require_cmd pnpm

  # 确保测试环境变量
  export NODE_ENV=${NODE_ENV:-test}

  # 确保 .env.test 存在
  if [ ! -f .env.test ]; then
    if [ -f .env.test.example ]; then
      echo -e "${YELLOW}⚠️  .env.test 未找到，正在从 .env.test.example 创建${NC}"
      cp .env.test.example .env.test
    else
      echo -e "${YELLOW}⚠️  .env.test 未找到，且缺少 .env.test.example，请手动准备测试环境变量${NC}"
    fi
  fi

  # 生成 Prisma 客户端（与 schema 对齐）
  echo -e "${BLUE}🧬 Generating Prisma Client...${NC}"
  pnpm db:generate >/dev/null

  # 按需重置数据库（仅当传入 --reset-db）
  if [ "${RESET_DB}" = true ]; then
    echo -e "${YELLOW}🗄️  Resetting test database via prisma migrate reset...${NC}"
    pnpm db:reset --force
  fi

  # 按需种子数据
  if [ "${SEED}" = true ]; then
    echo -e "${BLUE}🌱 Seeding database...${NC}"
    pnpm db:seed
  fi
}

# 运行测试（使用 pnpm 脚本与 jest 多项目）
run_tests() {
  local test_type=$1

  if [ "${LINT}" = true ]; then
    echo -e "${BLUE}🧹 Running lint...${NC}"
    pnpm lint
  fi

  case "$test_type" in
    unit)
      echo -e "${GREEN}🧪 Running unit tests...${NC}"
      if [ "${WATCH}" = true ]; then
        pnpm test:unit:watch -- ${EXTRA_ARGS[@]:-}
      else
        pnpm test:unit -- ${EXTRA_ARGS[@]:-}
      fi
      ;;
    integration)
      echo -e "${GREEN}🔗 Running integration tests...${NC}"
      if [ "${WATCH}" = true ]; then
        pnpm test:integration:watch -- ${EXTRA_ARGS[@]:-}
      else
        pnpm test:integration -- ${EXTRA_ARGS[@]:-}
      fi
      ;;
    e2e)
      echo -e "${GREEN}🌐 Running end-to-end tests...${NC}"
      # e2e 未提供 watch 脚本，直接追加 --watch 即可
      if [ "${WATCH}" = true ]; then
        pnpm test:e2e -- --watch ${EXTRA_ARGS[@]:-}
      else
        pnpm test:e2e -- ${EXTRA_ARGS[@]:-}
      fi
      ;;
    system)
      echo -e "${GREEN}🏗️  Running system tests...${NC}"
      if [ "${WATCH}" = true ]; then
        pnpm test:system:watch -- ${EXTRA_ARGS[@]:-}
      else
        pnpm test:system -- ${EXTRA_ARGS[@]:-}
      fi
      ;;
    all)
      if [ "${COVERAGE}" = true ]; then
        echo -e "${GREEN}🎯 Running all tests with coverage (test:ci)...${NC}"
        pnpm test:ci -- ${EXTRA_ARGS[@]:-}
      else
        echo -e "${GREEN}🎯 Running all tests (test:all)...${NC}"
        pnpm test:all -- ${EXTRA_ARGS[@]:-}
      fi
      ;;
  esac
}

# 清理测试环境（覆盖率与测试数据）
cleanup() {
  echo -e "${BLUE}🧹 Cleaning up test artifacts...${NC}"
  rm -rf coverage/
  # 如需额外报告目录，在此添加

  echo -e "${BLUE}🧽 Cleaning DB test data (db:clean)...${NC}"
  pnpm db:clean || true
  echo -e "${GREEN}✅ Cleanup completed${NC}"
}

main() {
  local test_type="all"
  COVERAGE=false
  WATCH=false
  LINT=false
  RESET_DB=false
  SEED=false

  # 收集 "--" 之后传给 jest 的参数
  EXTRA_ARGS=()

  # 解析参数
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -u|--unit)
        test_type="unit"; shift ;;
      -i|--integration)
        test_type="integration"; shift ;;
      -e|--e2e)
        test_type="e2e"; shift ;;
      -s|--system)
        test_type="system"; shift ;;
      -a|--all)
        test_type="all"; shift ;;
      -w|--watch)
        WATCH=true; shift ;;
      -c|--coverage)
        COVERAGE=true; shift ;;
      --lint)
        LINT=true; shift ;;
      --reset-db)
        RESET_DB=true; shift ;;
      --seed)
        SEED=true; shift ;;
      --cleanup)
        cleanup; exit 0 ;;
      -h|--help)
        show_help; exit 0 ;;
      --)
        shift
        while [[ $# -gt 0 ]]; do EXTRA_ARGS+=("$1"); shift; done
        ;;
      *)
        echo -e "${RED}❌ Unknown option: $1${NC}"; echo ""; show_help; exit 1 ;;
    esac
  done

  # 环境准备
  setup_environment

  # 运行测试
  run_tests "$test_type"

  # 覆盖率提示（Jest 负责生成，各项目目录下）
  if [ "${COVERAGE}" = true ]; then
    echo -e "${GREEN}✅ Coverage generated in per-project dirs under coverage/*${NC}"
  fi

  echo -e "${GREEN}🎉 All tests completed!${NC}"
}

main "$@"
