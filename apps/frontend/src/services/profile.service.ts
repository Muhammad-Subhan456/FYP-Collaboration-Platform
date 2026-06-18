import api from "@/lib/axios";
import type { Department } from "@/types";
import type { UserProfile } from "@/types/profile";

export interface StudentProfileInput {
  fullName: string;
  email?: string;
  profilePicture?: string;
  registrationNumber: string;
  department: Department;
  batch: string;
  degreeProgram: string;
  semester: number;
  skills: string[];
  interests: string[];
  linkedIn?: string;
  github?: string;
  bio?: string;
}

export interface SupervisorProfileInput {
  fullName: string;
  email?: string;
  profilePicture?: string;
  facultyId: string;
  department: Department;
  designation: string;
  researchAreas: string[];
  publications?: string[];
  officeLocation?: string;
  officeHours?: string;
  linkedIn?: string;
  googleScholar?: string;
  biography?: string;
}

export interface CoordinatorProfileInput {
  fullName: string;
  email?: string;
  profilePicture?: string;
  facultyId: string;
  department: Department;
  designation: string;
  coordinatorRole?: string;
  officeLocation?: string;
  contactInformation?: string;
  biography?: string;
}

export const profileService = {
  getMyProfile: async () => {
    const res = await api.get<UserProfile | null>("/profiles/me");
    return res.data;
  },

  getProfileById: async (authUserId: string) => {
    const res = await api.get<UserProfile | null>(`/profiles/${authUserId}`);
    return res.data;
  },

  getBatchProfiles: async (authUserIds: string[]) => {
    if (authUserIds.length === 0) return {};
    const res = await api.post<Record<string, UserProfile>>("/profiles/batch", {
      authUserIds,
    });
    return res.data;
  },

  createStudentProfile: async (data: StudentProfileInput) => {
    const res = await api.post<UserProfile>("/profiles/me/student", data);
    return res.data;
  },

  createSupervisorProfile: async (data: SupervisorProfileInput) => {
    const res = await api.post<UserProfile>("/profiles/me/supervisor", data);
    return res.data;
  },

  createCoordinatorProfile: async (data: CoordinatorProfileInput) => {
    const res = await api.post<UserProfile>("/profiles/me/coordinator", data);
    return res.data;
  },

  updateMyProfile: async (data: Partial<UserProfile>) => {
    const res = await api.patch<UserProfile>("/profiles/me", data);
    return res.data;
  },
};
