export type CompanyStatus = "active" | "suspended";

export type PlatformCompany = {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  ownerName: string;
  ownerEmail: string;
  userCount: number;
  createdAt: string;
};
