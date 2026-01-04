#!/bin/bash

# 代码格式化和检查脚本
# 依次执行 format 和 lint 命令

echo "🎨 Starting code formatting and linting..."
echo ""

# 执行格式化
echo "📝 Running format command..."
if pnpm format; then
    echo "✅ Format completed successfully"
else
    echo "❌ Format failed"
    exit 1
fi
echo ""

# 执行代码检查
echo "🔍 Running lint command..."
if pnpm lint; then
    echo "✅ Lint completed successfully"
else
    echo "❌ Lint failed"
    exit 1
fi
echo ""

echo "🎉 Code formatting and linting completed successfully!"