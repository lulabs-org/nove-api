# 云盘与 Minute 文件

云盘模块提供个人空间、组织空间和待归属系统空间。`StorageObject` 仍是不可变的物理对象；`DriveFile` 和 `FileVersion` 提供稳定文件身份与版本，`DriveNode` 提供目录树，`FileBinding` 负责业务关联。

## 安全边界

- OSS Bucket 必须保持私有，数据库不保存永久访问 URL。
- 上传由浏览器使用 15 分钟有效的签名地址直接分片上传；会话 24 小时过期。
- 完成分片后，API 只校验扩展名、MIME、Magic Bytes、OpenXML 包结构和大小；需要杀毒的文件以 `VERIFYING` 状态入库并交给 BullMQ Worker。
- Worker 扫描通过后才切换为 `ACTIVE`；扫描命中、超时或 Provider 错误均失败关闭，`VERIFYING/REJECTED` 文件不能下载。
- SVG 和 HTML 始终以附件方式下载，不以内联方式执行。
- 生产默认使用阿里云云安全中心恶意文件检测；本地或专用扫描节点可选择 ClamAV。
- PDF、Office、文本、HTML/SVG 和图片强制扫描。音视频经过格式、大小和来源校验，但不做整文件杀毒，避免 2–20 GiB 媒体穿过 API 或扫描服务器。
- Personal Space 仅所有者和超级管理员可访问；组织空间要求 ACTIVE 成员身份和组织一致。
- ACL 按最近的显式层生效，同层 `DENY` 优先于 `ALLOW`；业务权限和 API Key/OAuth Scope 仍会继续收窄访问。
- Minute 系统文件还要求 `minute:read`，普通用户不能移动、删除或解除系统关联。

## 主要接口

接口前缀为 `/drive`：

- `GET /spaces`、`GET /spaces/:spaceId/nodes`
- `POST /folders`、`PATCH /nodes/:nodeId`、`POST /nodes/:nodeId/move`
- `POST /upload-sessions`、`POST /upload-sessions/:id/parts`、`POST /upload-sessions/:id/complete`
- `GET /files/:fileId`、`POST /files/:fileId/download-url`、`GET /files/:fileId/bindings`
- 节点及空间授权接口、节点审计接口、回收站与恢复接口

Minute 文件使用 `GET/POST /minutes/:minuteId/files`。上传普通组织文件后再关联 Minute，服务会将其标记为系统文件并移动到 `/会议资料/{year}/{month}/{meetingId}/`。

## 部署配置

在 Admin 的“系统配置 → 云盘与会议文件”中配置：

- 必填的会议同步默认组织 ID；腾讯会议和飞书同步在缺少有效组织时失败关闭。
- 安全扩展名白名单和各类别大小上限。
- 病毒扫描 Provider、阿里云 SAS 地域/轮询参数，或 ClamAV 主机、端口和超时。
- 下载 URL 有效期和回收站保留天数。

OSS CORS 必须允许 Admin 来源执行 `PUT`，并在响应头中暴露 `ETag`。对象默认 ACL 必须为 private。

可先预览、再合并写入当前 Bucket 的 CORS 规则：

```bash
pnpm drive:configure-oss-cors
pnpm drive:configure-oss-cors --apply
```

来源读取顺序为 `DRIVE_OSS_CORS_ORIGINS`、`CORS_ORIGINS`、`NOVE_ADMIN_URL`，只接受明确的 HTTP(S) Origin，不接受通配符。签名上传和下载地址始终使用 HTTPS。

Provider 读取优先级为 Admin 系统配置、`DRIVE_MALWARE_SCAN_PROVIDER` 环境变量、环境默认值；生产环境在前两者均缺失时选择 `ALIYUN_SAS`。阿里云调用凭证沿用标准凭证链，不在数据库保存 AccessKey；RAM 身份至少需要 `yundun-sas:CreateFileDetect` 和 `yundun-sas:GetFileDetectResult`。首次使用前需在云安全中心开通恶意文件检测额度。

阿里云接口要求完整文件 SHA-256，因此 Admin 会在创建上传会话前对强制扫描文件计算 SHA-256。文件随后仍由浏览器直传私有 OSS，API 不接收文件正文；Worker 只把短期签名下载 URL 提交给阿里云。阿里云 SDK 单文件上限为 100 MiB，当前强制扫描类别本身也不超过该上限。大音视频不会被伪装成“已扫描”，其版本记录会明确保存 `POLICY_BYPASS` 与校验原因。

主 `docker-compose.yml` 不包含 ClamAV。需要本地扫描时叠加 `docker-compose.clamav.yml`：

```bash
docker compose -f docker-compose.yml -f docker-compose.clamav.yml up -d
docker compose -f docker-compose.yml -f docker-compose.clamav.yml ps clamav
```

只需要为宿主机上的 API 启动扫描服务时，可以执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.clamav.yml up -d clamav
```

宿主机运行 API 时使用 `CLAMAV_HOST=127.0.0.1`；叠加配置会把容器内 `nove` 的 Provider 显式设置为 `CLAMAV`，并使用 `CLAMAV_HOST=clamav`。病毒库保存在 `clamav_data` Volume 中，首次启动需要等待病毒库和扫描引擎就绪。停止本地扫描服务时使用相同的 `-f` 参数执行 `down`，否则 Compose 无法识别叠加文件中的服务和 Volume。

Compose 将 `INSTREAM`、单文件和总扫描上限配置为 2 GiB，并把单次扫描时限设为 10 分钟。实际云盘策略只把不超过 100 MiB 的强制扫描类别交给 ClamAV；音视频不进入该数据链路。

## 发布与旧数据回填

1. 执行 Prisma migration 和权限 seed。
2. 配置云盘默认组织、病毒扫描 Provider、OSS 私有 Bucket 与 CORS；使用阿里云时先开通恶意文件检测并授予最小 RAM 权限。
3. 先执行 `pnpm db:backfill:minute-drive` 查看待回填数量。
4. 确认后执行 `pnpm db:backfill:minute-drive -- --apply`。脚本只创建逻辑文件和绑定，不复制 OSS 对象。
5. 校验 MinuteFile 数量、绑定数量和随机下载 SHA-256 后，再切换生产读取流量。

旧 `MinuteFile.fileObjectId` 在兼容发布周期内保留。V2 自定义数据表运行时不属于本次交付；`CUSTOM_RECORD` 绑定类型仅作为后续扩展点。
