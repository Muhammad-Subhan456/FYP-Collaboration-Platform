import { z } from "zod";

const optionalHttpUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .url("Enter a valid URL starting with http:// or https://")
      .max(300, "URL must be at most 300 characters"),
  ])
  .optional();

export const studentProfileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  registrationNumber: z
    .string()
    .trim()
    .min(1, "Registration number is required")
    .max(50, "Registration number must be at most 50 characters"),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"], {
    message: "Select a valid department",
  }),
  batch: z
    .string()
    .trim()
    .min(1, "Batch is required")
    .max(30, "Batch must be at most 30 characters"),
  degreeProgram: z
    .string()
    .trim()
    .min(1, "Degree program is required")
    .max(100, "Degree program must be at most 100 characters"),
  semester: z
    .number({ message: "Semester is required" })
    .int("Semester must be a whole number")
    .min(1, "Semester must be between 1 and 12")
    .max(12, "Semester must be between 1 and 12"),
  cgpa: z
    .number({ message: "CGPA must be a number" })
    .min(0, "CGPA must be between 0.00 and 4.00")
    .max(4, "CGPA must be between 0.00 and 4.00")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(
      /^[+]?[0-9\s()-]{7,20}$/,
      "Enter a valid phone number (7-20 digits)",
    )
    .optional()
    .or(z.literal("")),
  skills: z
    .string()
    .max(500, "Skills list is too long")
    .optional()
    .or(z.literal("")),
  interests: z
    .string()
    .max(500, "Interests list is too long")
    .optional()
    .or(z.literal("")),
  linkedIn: optionalHttpUrl,
  github: optionalHttpUrl,
  bio: z
    .string()
    .max(1000, "Bio must be at most 1000 characters")
    .optional()
    .or(z.literal("")),
});

export type StudentProfileFormValues = z.infer<typeof studentProfileFormSchema>;

export const studentOnboardingSchema = studentProfileFormSchema.extend({
  fullName: studentProfileFormSchema.shape.fullName,
});
