export type OrganizationMemberRole = "owner" | "admin";

export type OrganizationMemberPermissions = {
  can_edit_profile: boolean;
  can_manage_posts: boolean;
  can_manage_members: boolean;
  can_manage_applications: boolean;
};

export type OrganizationMemberRow = {
  id: string;
  user_id: string;
  role: string;
} & OrganizationMemberPermissions;

