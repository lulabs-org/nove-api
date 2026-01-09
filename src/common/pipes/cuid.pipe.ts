/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 04:27:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 05:53:43
 * @FilePath: /lulab_backend/src/common/pipes/cuid.pipe.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * 自定义 Cuid 验证 Pipe
 * 用于验证 cuid 格式的 ID
 */
@Injectable()
export class CuidPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID 不能为空');
    }

    const cuidRegex = /^c[a-z0-9]{24}$/i;
    if (!cuidRegex.test(value)) {
      throw new BadRequestException('ID 格式不正确，必须是 cuid 格式');
    }

    return value;
  }
}
