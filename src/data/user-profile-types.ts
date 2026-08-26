export type UserRole = "admin" | "seller";
export type CompanyRole = "owner" | "admin" | "seller" | "member";

export type CompanySummary = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
};

export type CompanyMembership = {
  companyId: string;
  userId: string;
  role: CompanyRole;
  isActive: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  sellerDisplayName: string;
  role: UserRole;
  commissionPercent: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: CompanySummary;
  companyRole?: CompanyRole;
  isPlatformAdmin?: boolean;
};

export type UserProfileInput = {
  email: string;
  password?: string;
  fullName: string;
  sellerDisplayName: string;
  role: UserRole;
  commissionPercent: number;
  isActive?: boolean;
};
