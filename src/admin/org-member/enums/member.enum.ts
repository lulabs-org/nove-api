/**
 * 组织成员类型
 */
export enum MemberType {
  /** 内部员工 */
  INTERNAL = 'INTERNAL',
  /** 外部人员/外包 */
  EXTERNAL = 'EXTERNAL',
}

/**
 * 组织成员状态
 */
export enum MemberStatus {
  /** 已邀请（待激活/待验证） */
  INVITED = 'INVITED',
  /** 正常/在职 */
  ACTIVE = 'ACTIVE',
  /** 已停用/禁用 */
  SUSPENDED = 'SUSPENDED',
  /** 已离职 */
  LEFT = 'LEFT',
}
