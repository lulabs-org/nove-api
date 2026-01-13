export interface RoleMap {
  admin: { id: string };
  finance: { id: string };
  customerService: { id: string };
  user: { id: string };
}

export type RolePermissionMap = {
  admin: { id: string };
  finance: { id: string };
  customerService: { id: string };
  user: { id: string };
};

export type RoleDataPermissionMap = {
  admin: { id: string };
  finance: { id: string };
};
