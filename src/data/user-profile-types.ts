export type UserRole = "admin" | "seller";

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
