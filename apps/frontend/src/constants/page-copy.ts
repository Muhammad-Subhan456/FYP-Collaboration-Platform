/**
 * Short, user-facing page subtitles shown in the portal header.
 * Keep concise, professional, and free of implementation details.
 */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  // Student
  "/student/dashboard": "", // greeting applied in RoleLayout
  "/student/team": "Create or join a team for your project",
  "/student/proposal": "Prepare and send your project proposal",
  "/student/work-stream": "Announcements and deliverables from your supervisor",
  "/student/calendar": "Your deliverable deadlines by phase",
  "/student/milestones": "Track team tasks and milestones",
  "/student/evaluations": "Your evaluation progress and schedule",
  "/student/results": "Your marks, grades, and GPA",
  "/student/announcements": "Program announcements for students",
  "/student/notifications": "Updates related to your project",
  "/student/profile": "Your student profile",

  // Supervisor
  "/supervisor/dashboard": "",
  "/supervisor/requests": "Review proposals sent to you",
  "/supervisor/invitations": "Express interest in teams to supervise",
  "/supervisor/work-stream": "Announcements and deliverables for your teams",
  "/supervisor/calendar": "Official program deliverable schedule",
  "/supervisor/milestones": "View team progress and leave feedback",
  "/supervisor/results": "Marks and GPA for your supervised teams",
  "/supervisor/teams": "Teams you currently supervise",
  "/supervisor/announcements": "Program announcements for supervisors",
  "/supervisor/notifications": "Updates related to your supervision",
  "/supervisor/profile": "Your supervisor profile",

  // Coordinator
  "/coordinator/dashboard": "",
  "/coordinator/users": "Manage members by role",
  "/coordinator/teams": "All project teams in this program",
  "/coordinator/proposals": "Track proposal status across teams",
  "/coordinator/announcements": "Share announcements with selected roles",
  "/coordinator/phases": "Define academic phases for this program",
  "/coordinator/deliverable-templates":
    "Define deliverables and marking criteria",
  "/coordinator/calendar": "Master timeline of program deliverables",
  "/coordinator/submissions": "Review submitted work and progress",
  "/coordinator/evaluations": "Assign evaluators to submissions",
  "/coordinator/results": "Program marks, grades, and GPA",
  "/coordinator/analytics": "Program insights and trends",
  "/coordinator/notifications": "Updates for your workspace",
  "/coordinator/profile": "Your coordinator profile",

  // Evaluator
  "/evaluator/dashboard": "",
  "/evaluator/evaluations": "Your assigned and completed evaluations",
  "/evaluator/notifications": "Updates related to your evaluations",
  "/evaluator/profile": "Your evaluator profile",

  // Super admin
  "/super-admin/workspaces": "Create and manage program workspaces",
  "/super-admin/system-health": "Service and database status",
};

export interface PageGuidance {
  purpose: string;
  actions: string[];
  tip?: string;
}

/**
 * Concise page help shown from the header Info control.
 * User-focused; no implementation details.
 */
export const PAGE_GUIDANCE: Record<string, PageGuidance> = {
  "/student/dashboard": {
    purpose: "See your team status, proposal progress, and upcoming work at a glance.",
    actions: [
      "Check whether you have a team and if your profile is complete",
      "Review proposal status and open announcements or deliverables",
      "Jump to the pages you need from the cards below",
    ],
  },
  "/student/team": {
    purpose: "Build or join a project team and keep member details up to date.",
    actions: [
      "Create a team or browse open teams to join",
      "Manage roles and join requests if you are the leader",
      "Complete project details before sending a proposal",
    ],
    tip: "Only the team leader can send proposals to supervisors.",
  },
  "/student/proposal": {
    purpose: "Prepare your project proposal and request supervision.",
    actions: [
      "Review your proposal status",
      "Send a request to a supervisor or respond to interest",
      "Track earlier requests and outcomes",
    ],
    tip: "Unreviewed requests expire after a short window—send only when ready.",
  },
  "/student/work-stream": {
    purpose: "Stay on top of supervisor announcements and assigned deliverables.",
    actions: [
      "Read announcements from your supervisor",
      "Open deliverables and submit work when due",
      "Follow comments and feedback on each item",
    ],
  },
  "/student/calendar": {
    purpose: "See the deadlines that apply to your team across the program.",
    actions: [
      "Filter by phase",
      "Switch between schedule and month views",
      "Open a deliverable for details or jump to Work Stream",
    ],
    tip: "Your due date comes from your supervisor’s publish settings, or falls back to the coordinator’s date when they leave it blank.",
  },
  "/student/milestones": {
    purpose: "Plan and track team tasks until work is done.",
    actions: [
      "Create tasks and claim work",
      "Update status as you progress",
      "Filter by open, in progress, or completed items",
    ],
  },
  "/student/evaluations": {
    purpose: "Follow marking progress and scheduled viva or evaluation events.",
    actions: [
      "See which deliverables are being marked",
      "Check scheduled events from your coordinator",
      "Open Results when marks are ready",
    ],
  },
  "/student/results": {
    purpose: "View your marks, grades, and GPA by phase.",
    actions: [
      "Filter by phase or deliverable",
      "Review criteria marks and combined totals",
      "Check phase completion and grade",
    ],
  },
  "/student/notifications": {
    purpose: "Catch up on updates about your team, proposals, and submissions.",
    actions: ["Open a notification to go to the related page", "Mark items as read as you go"],
  },
  "/student/profile": {
    purpose: "Keep your personal profile accurate for the program.",
    actions: ["Update your details and save changes"],
  },

  "/supervisor/dashboard": {
    purpose: "Overview of the teams you supervise and work that needs attention.",
    actions: [
      "See supervised teams and pending proposals",
      "Review recent deliverables",
      "Open the relevant module for follow-up",
    ],
  },
  "/supervisor/requests": {
    purpose: "Decide which teams you will supervise.",
    actions: [
      "Review each proposal carefully",
      "Accept to take on supervision, or decline with a reason",
    ],
    tip: "Your decision assigns supervision for that team.",
  },
  "/supervisor/invitations": {
    purpose: "Find teams you may want to supervise and express interest.",
    actions: [
      "Browse available teams",
      "Express interest so they can send you a proposal",
      "Track interest you have already shared",
    ],
  },
  "/supervisor/work-stream": {
    purpose: "Publish announcements and manage deliverables for your teams.",
    actions: [
      "Create announcements for selected teams",
      "Assign deliverables from templates",
      "Review submissions and leave feedback",
    ],
  },
  "/supervisor/calendar": {
    purpose: "Follow the official coordinator schedule while managing your teams.",
    actions: [
      "Filter by phase",
      "Review deliverable names, descriptions, and coordinator due dates",
      "Use Work Stream to publish or adjust team deadlines",
    ],
    tip: "This calendar shows the master program dates. Student calendars use the deadline you set when publishing.",
  },
  "/supervisor/milestones": {
    purpose: "Observe team task progress and leave feedback.",
    actions: [
      "Switch between supervised teams",
      "Review open and completed tasks",
      "Add comments where helpful",
    ],
  },
  "/supervisor/results": {
    purpose: "Review marks and GPA for students on your supervised teams.",
    actions: [
      "Filter by phase, deliverable, or team",
      "Download CSV of the filtered view",
      "Promote a grade when eligible",
    ],
  },
  "/supervisor/teams": {
    purpose: "See the teams you currently supervise and their members.",
    actions: ["Open a team to view members", "Review proposal details when needed"],
  },
  "/supervisor/notifications": {
    purpose: "Stay informed about proposals, submissions, and team activity.",
    actions: ["Open a notification to jump to the related work"],
  },
  "/supervisor/profile": {
    purpose: "Manage your supervisor profile details.",
    actions: ["Update and save your information"],
  },

  "/coordinator/dashboard": {
    purpose: "Monitor program health across teams, proposals, and evaluations.",
    actions: [
      "Review key counts and trends",
      "Spot areas that need attention",
      "Open the related module for action",
    ],
  },
  "/coordinator/users": {
    purpose: "Manage who belongs to this program and in which role.",
    actions: [
      "Search and filter members",
      "Invite or import users",
      "Change roles or enable or disable memberships",
    ],
  },
  "/coordinator/teams": {
    purpose: "Browse every project team in the program.",
    actions: ["Search teams", "Expand a team to see members"],
  },
  "/coordinator/proposals": {
    purpose: "Track proposal status and supervisor decisions across teams.",
    actions: ["Search or filter by status", "Follow up on proposals awaiting action"],
  },
  "/coordinator/announcements": {
    purpose: "Share program-wide announcements with the right audience.",
    actions: [
      "Create an announcement with optional attachments",
      "Choose which roles should receive it",
      "Review previously published messages",
    ],
  },
  "/coordinator/phases": {
    purpose: "Define academic phases and publish configuration when ready.",
    actions: [
      "Create or edit phases",
      "Publish a phase once deliverable weightings total 100%",
    ],
    tip: "GPA for a phase becomes available after publication and completed evaluations.",
  },
  "/coordinator/deliverable-templates": {
    purpose: "Define deliverables and marking criteria for each phase.",
    actions: [
      "Filter by phase",
      "Create templates with criteria and weightings",
      "Edit only while a template has not been published by a supervisor",
    ],
  },
  "/coordinator/calendar": {
    purpose: "View the master project calendar built from your deliverable templates.",
    actions: [
      "Filter by phase",
      "Review the official schedule in list or month view",
      "Update templates to keep the calendar in sync",
    ],
    tip: "Creating or editing a deliverable template with a due date updates this calendar automatically.",
  },
  "/coordinator/submissions": {
    purpose: "Review submitted work and track supervisor completion.",
    actions: [
      "Filter forwarded submissions and switch list or table view",
      "Sort and page through results",
      "Remind supervisors when deliverables are still pending",
    ],
  },
  "/coordinator/evaluations": {
    purpose: "Assign evaluators to submitted work and follow progress.",
    actions: [
      "Filter eligible submissions",
      "Assign one or more evaluators",
      "Send reminders for pending evaluations",
    ],
  },
  "/coordinator/results": {
    purpose: "Review program marks, grades, and GPA.",
    actions: [
      "Filter phase and deliverable results",
      "Download CSV of the current filtered view",
      "Promote a grade when eligible",
    ],
  },
  "/coordinator/analytics": {
    purpose: "Explore program trends and summaries.",
    actions: ["Review charts for proposals, teams, and progress"],
  },
  "/coordinator/notifications": {
    purpose: "See updates for your workspace.",
    actions: ["Open a notification to go to the related page"],
  },
  "/coordinator/profile": {
    purpose: "Manage your coordinator profile.",
    actions: ["Update and save your details"],
  },

  "/evaluator/dashboard": {
    purpose: "See assigned work and program announcements for evaluators.",
    actions: ["Open pending evaluations", "Read announcements that apply to you"],
  },
  "/evaluator/evaluations": {
    purpose: "Complete assigned evaluations and review submitted marks.",
    actions: [
      "Filter your evaluation list",
      "Open a row to mark students or view results",
    ],
  },
  "/evaluator/evaluation-detail": {
    purpose: "Score each student against the marking criteria.",
    actions: [
      "Review the submitted file",
      "Enter marks per criterion and add remarks",
      "Save a draft or submit when finished",
    ],
    tip: "Totals update as you enter marks.",
  },
  "/evaluator/notifications": {
    purpose: "Stay informed about evaluation assignments and reminders.",
    actions: ["Open a notification to jump to the related evaluation"],
  },
  "/evaluator/profile": {
    purpose: "Manage your evaluator profile.",
    actions: ["Update and save your details"],
  },

  "/super-admin/workspaces": {
    purpose: "Create and manage independent program workspaces.",
    actions: [
      "Create a workspace with a coordinator",
      "Show or hide archived workspaces",
      "Review members and teams at a glance",
    ],
  },
  "/super-admin/system-health": {
    purpose: "Check whether platform services are healthy.",
    actions: ["Refresh status", "Review each service and the database"],
  },
};

function resolveCopyKey(
  pathname: string,
  map: Record<string, unknown>,
): string | undefined {
  if (map[pathname] !== undefined) {
    return pathname;
  }

  const match = Object.keys(map)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match;
}

export function getPageDescription(pathname: string): string | undefined {
  const key = resolveCopyKey(pathname, PAGE_DESCRIPTIONS);
  if (!key) {
    return undefined;
  }

  const value = PAGE_DESCRIPTIONS[key];
  return value || undefined;
}

export function getPageGuidance(pathname: string): PageGuidance | undefined {
  if (/^\/evaluator\/evaluations\/[^/]+$/.test(pathname)) {
    return PAGE_GUIDANCE["/evaluator/evaluation-detail"];
  }

  const key = resolveCopyKey(pathname, PAGE_GUIDANCE);
  if (!key) {
    return undefined;
  }

  return PAGE_GUIDANCE[key];
}
