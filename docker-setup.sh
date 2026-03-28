#!/bin/bash
###
 # @Author: 杨仕明 bot@qclaw.ai
 # @Date: 2026-03-28 14:30:43
 # @LastEditors: 杨仕明 bot@qclaw.ai
 # @LastEditTime: 2026-03-28 14:39:37
 # @FilePath: /nove_api/docker-setup.sh
 # @Description: 
 # 
 # Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
### 

set -e

echo "=========================================="
echo "  Nove Docker Setup Script"
echo "=========================================="
echo ""

# Get current IP and country
echo "Checking your location..."
IP_INFO=$(curl -s http://ip-api.com/json/ || echo '{"countryCode":"UNKNOWN"}')
COUNTRY_CODE=$(echo $IP_INFO | grep -o '"countryCode":"[^"]*"' | cut -d'"' -f4)
CURRENT_IP=$(echo $IP_INFO | grep -o '"query":"[^"]*"' | cut -d'"' -f4)

echo "Your IP: $CURRENT_IP"
echo "Country Code: $COUNTRY_CODE"
echo ""

# Check if in China
if [ "$COUNTRY_CODE" = "CN" ]; then
  echo "Detected you are in China."
  echo "Note: Docker build may be slow. Consider using npm registry mirrors:"
  echo "  - npmmirror: https://registry.npmmirror.com"
  echo "  - Tencent: https://mirrors.cloud.tencent.com/npm/"
  echo "  - Huawei: https://mirrors.huaweicloud.com/repository/npm/"
  echo "  - USTC: https://npmreg.proxy.ustclug.org/"
else
  echo "You are not in China, using default npm registry."
fi

echo ""
echo "=========================================="
echo "  Building Docker Image"
echo "=========================================="

docker build \
  -t noveapi:local \
  -f Dockerfile \
  .

echo ""
echo "=========================================="
echo "  Starting Docker Compose"
echo "=========================================="

# Start docker-compose
docker-compose up -d

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Services are starting. You can check the status with:"
echo "  docker-compose ps"
echo ""
echo "View logs with:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services with:"
echo "  docker-compose down"
echo ""
