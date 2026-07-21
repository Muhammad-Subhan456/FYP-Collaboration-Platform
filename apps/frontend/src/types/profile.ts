import type { Department, UserRole } from "@/types";

export type ProfileType = UserRole;

export interface UserProfile {
  id: string;
  authUserId: string;
  profileType: ProfileType;
  profilePicture?: string | null;
  fullName: string;
  email?: string | null;
  registrationNumber?: string | null;
  department?: Department | null;
  batch?: string | null;
  degreeProgram?: string | null;
  semester?: number | null;
  cgpa?: number | null;
  phone?: string | null;
  skills: string[];
  interests: string[];
  linkedIn?: string | null;
  github?: string | null;
  bio?: string | null;
  facultyId?: string | null;
  designation?: string | null;
  officeLocation?: string | null;
  biography?: string | null;
  researchAreas: string[];
  publications: string[];
  officeHours?: string | null;
  googleScholar?: string | null;
  coordinatorRole?: string | null;
  contactInformation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserRecord {
  membershipId: string;
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  userIsActive?: boolean;
  createdAt: string;
}
