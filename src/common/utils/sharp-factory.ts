import * as sharpModule from 'sharp';
import type { Sharp, SharpOptions } from 'sharp';

interface SharpFactory {
  (options?: SharpOptions): Sharp;
  (input: Buffer, options?: SharpOptions): Sharp;
}

export const sharpFactory = sharpModule as unknown as SharpFactory;
