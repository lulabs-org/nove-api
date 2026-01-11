/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-31 21:03:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 00:52:38
 * @FilePath: /nove_api/prisma/seeds/mock/index.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export { createUsersWithRoles as createUsers, type CreatedUsers, type RoleMap } from './users';

export { createOrganization } from './organization';

export {
  createDepartments,
  createUserDepartmentRelations,
  type CreatedDepartments,
} from './departments';

export {
  createPermissions,
  type CreatedPermissions,
} from './permissions';

export { createProducts, type CreatedProducts } from './products';

export { createProjects, type CreatedProjects } from './projects';

export {
  createCurriculums,
  type CreatedCurriculums,
  type CreateCurriculumsParams,
} from './curriculums';

export { createChannels, type CreatedChannels } from './channels';

export {
  createPlatformUsers,
  type CreatedPlatformUsers,
} from './meetings/platform-users';

export { createMeetings, type CreatedMeetings } from './meetings/meetings';

export { createTeamMeetingRecording } from './meetings/recordings';

export { createTeamSummary } from './meetings/summaries';

export {
  createMeetingParticipants,
  type CreatedParticipants,
} from './meetings/participants';

export { createSimulatedTranscript } from './transcripts';

export { createOrders } from './orders';

export { createRefunds } from './refunds';

export {
  createAllRelations,
  createUserOrganizationRelations,
  createUserPermissionRelations,
  createRolePermissionRelations,
} from './relations';

export { createAdmin, type CreatedAdmin } from '../real/admin';
