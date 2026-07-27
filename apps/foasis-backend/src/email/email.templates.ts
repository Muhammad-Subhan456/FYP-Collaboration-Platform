import { escapeHtml } from '../common/helpers/html-escape';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Overrides EMAIL_REPLY_TO when set. */
  replyTo?: string;
  /** Stable key so provider retries do not create duplicate messages. */
  idempotencyKey?: string;
  /** Structured log label (e.g. invitation, password_reset). */
  type?: string;
};

export type InvitationEmailPayload = {
  to: string;
  workspaceName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
};

export type PasswordResetEmailPayload = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

export type AnnouncementEmailPayload = {
  to: string;
  title: string;
  message: string;
  actionUrl?: string;
};

export type SubmissionReminderEmailPayload = {
  to: string;
  deliverableTitle: string;
  phaseName: string;
  pendingCount: number;
  assignedCount: number;
  actionUrl?: string;
};

export type ProposalAcceptedEmailPayload = {
  to: string;
  proposalTitle: string;
  teamName?: string;
  actionUrl?: string;
};

export type DeliverablePublishedEmailPayload = {
  to: string;
  deliverableTitle: string;
  dueDate: Date;
  actionUrl?: string;
};

export function buildInvitationEmail(
  payload: InvitationEmailPayload,
): EmailMessage {
  const expiresText = payload.expiresAt.toLocaleString();

  return {
    to: payload.to,
    type: 'invitation',
    subject: `You're invited to ${payload.workspaceName} on FOASIS`,
    text: [
      `You have been invited to join ${payload.workspaceName} on FOASIS as ${payload.role}.`,
      '',
      `Accept your invitation and set your password:`,
      payload.invitationUrl,
      '',
      `This link expires on ${expiresText}.`,
    ].join('\n'),
    html: `
      <p>You have been invited to join <strong>${payload.workspaceName}</strong> on FOASIS as <strong>${payload.role}</strong>.</p>
      <p><a href="${payload.invitationUrl}">Accept invitation and set your password</a></p>
      <p>This link expires on ${expiresText}.</p>
    `,
  };
}

export function buildPasswordResetEmail(
  payload: PasswordResetEmailPayload,
): EmailMessage {
  const expiresText = payload.expiresAt.toLocaleString();

  return {
    to: payload.to,
    type: 'password_reset',
    subject: 'Reset your FOASIS password',
    text: [
      'We received a request to reset your FOASIS password.',
      '',
      `Reset your password: ${payload.resetUrl}`,
      '',
      `This link expires on ${expiresText}.`,
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>We received a request to reset your FOASIS password.</p>
      <p><a href="${payload.resetUrl}">Reset your password</a></p>
      <p>This link expires on ${expiresText}.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  };
}

export function buildAnnouncementEmail(
  payload: AnnouncementEmailPayload,
): EmailMessage {
  const actionLine = payload.actionUrl
    ? `\n\nView in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'announcement',
    subject: `FOASIS Announcement: ${payload.title}`,
    text: `${payload.title}\n\n${payload.message}${actionLine}`,
    html: `
      <p><strong>${escapeHtml(payload.title)}</strong></p>
      <p>${escapeHtml(payload.message).replace(/\n/g, '<br/>')}</p>
      ${
        payload.actionUrl
          ? `<p><a href="${escapeHtml(payload.actionUrl)}">View announcement in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildSubmissionReminderEmail(
  payload: SubmissionReminderEmailPayload,
): EmailMessage {
  const actionLine = payload.actionUrl
    ? `\n\nReview in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'submission_reminder',
    subject: `Reminder: ${payload.pendingCount} pending submission(s) for ${payload.deliverableTitle}`,
    text: [
      `You have ${payload.pendingCount} of ${payload.assignedCount} team(s) still pending finalized submission for "${payload.deliverableTitle}" (${payload.phaseName}).`,
      'Please review outstanding submissions and finalize approved work for the coordinator.',
      actionLine,
    ].join('\n'),
    html: `
      <p>You have <strong>${payload.pendingCount}</strong> of <strong>${payload.assignedCount}</strong> team(s) still pending finalized submission for <strong>${payload.deliverableTitle}</strong> (${payload.phaseName}).</p>
      <p>Please review outstanding submissions and finalize approved work for the coordinator.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open supervisor work stream</a></p>`
          : ''
      }
    `,
  };
}

export function buildProposalAcceptedEmail(
  payload: ProposalAcceptedEmailPayload,
): EmailMessage {
  const teamLine = payload.teamName
    ? ` for team "${payload.teamName}"`
    : '';
  const actionLine = payload.actionUrl
    ? `\n\nView in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'proposal_accepted',
    subject: `FOASIS: Proposal accepted — ${payload.proposalTitle}`,
    text: [
      `Good news! Your FOASIS proposal "${payload.proposalTitle}"${teamLine} has been accepted by your supervisor.`,
      'You can now continue with deliverables and project work in FOASIS.',
      actionLine,
    ].join('\n'),
    html: `
      <p>Good news! Your FOASIS proposal <strong>${payload.proposalTitle}</strong>${
        payload.teamName
          ? ` for team <strong>${payload.teamName}</strong>`
          : ''
      } has been accepted by your supervisor.</p>
      <p>You can now continue with deliverables and project work in FOASIS.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">View proposal in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildDeliverablePublishedEmail(
  payload: DeliverablePublishedEmailPayload,
): EmailMessage {
  const dueText = payload.dueDate.toLocaleDateString();
  const actionLine = payload.actionUrl
    ? `\n\nOpen in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'deliverable_published',
    subject: `FOASIS: New deliverable — ${payload.deliverableTitle}`,
    text: [
      `A new deliverable "${payload.deliverableTitle}" has been assigned to your team.`,
      `Due date: ${dueText}`,
      'Please review the requirements and submit before the deadline.',
      actionLine,
    ].join('\n'),
    html: `
      <p>A new deliverable <strong>${payload.deliverableTitle}</strong> has been assigned to your team.</p>
      <p><strong>Due date:</strong> ${dueText}</p>
      <p>Please review the requirements and submit before the deadline.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open work stream in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export type ProposalRequestEmailPayload = {
  to: string;
  teamName: string;
  projectTitle: string;
  studentLeaderName: string;
  workspaceName: string;
  actionUrl?: string;
};

export type SubmissionReceivedEmailPayload = {
  to: string;
  deliverableTitle: string;
  teamName: string;
  phaseName?: string | null;
  submittedAt: Date;
  actionUrl?: string;
};

export type EvaluationAssignmentEmailPayload = {
  to: string;
  deliverableTitle: string;
  teamName?: string | null;
  phaseName?: string | null;
  evaluationLabel: string;
  actionUrl?: string;
};

export type EvaluationReminderEmailPayload = {
  to: string;
  deliverableTitle: string;
  teamName: string;
  phaseName?: string | null;
  statusLabel: string;
  actionUrl?: string;
};

export type DeliverableTemplateAvailableEmailPayload = {
  to: string;
  deliverableTitle: string;
  phaseName: string;
  dueDate?: Date | null;
  description?: string | null;
  actionUrl?: string;
};

export function buildProposalRequestEmail(
  payload: ProposalRequestEmailPayload,
): EmailMessage {
  const actionLine = payload.actionUrl
    ? `\n\nReview in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'proposal_request',
    subject: `FOASIS: Proposal request — ${payload.projectTitle}`,
    text: [
      `A team has submitted a proposal request for your review on FOASIS.`,
      '',
      `Workspace: ${payload.workspaceName}`,
      `Team: ${payload.teamName}`,
      `Project: ${payload.projectTitle}`,
      `Student leader: ${payload.studentLeaderName}`,
      '',
      'Please respond promptly so the team can continue.',
      actionLine,
    ].join('\n'),
    html: `
      <p>A team has submitted a proposal request for your review on FOASIS.</p>
      <ul>
        <li><strong>Workspace:</strong> ${payload.workspaceName}</li>
        <li><strong>Team:</strong> ${payload.teamName}</li>
        <li><strong>Project:</strong> ${payload.projectTitle}</li>
        <li><strong>Student leader:</strong> ${payload.studentLeaderName}</li>
      </ul>
      <p>Please respond promptly so the team can continue.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open proposal review in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildSubmissionReceivedEmail(
  payload: SubmissionReceivedEmailPayload,
): EmailMessage {
  const submittedText = payload.submittedAt.toLocaleString();
  const phaseLine = payload.phaseName
    ? `Phase: ${payload.phaseName}`
    : null;
  const actionLine = payload.actionUrl
    ? `\n\nReview in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'submission_received',
    subject: `FOASIS: Submission received — ${payload.deliverableTitle}`,
    text: [
      `A team has submitted work for "${payload.deliverableTitle}".`,
      '',
      `Team: ${payload.teamName}`,
      ...(phaseLine ? [phaseLine] : []),
      `Submitted at: ${submittedText}`,
      '',
      'Please review the submission in your work stream.',
      actionLine,
    ].join('\n'),
    html: `
      <p>A team has submitted work for <strong>${payload.deliverableTitle}</strong>.</p>
      <ul>
        <li><strong>Team:</strong> ${payload.teamName}</li>
        ${
          payload.phaseName
            ? `<li><strong>Phase:</strong> ${payload.phaseName}</li>`
            : ''
        }
        <li><strong>Submitted at:</strong> ${submittedText}</li>
      </ul>
      <p>Please review the submission in your work stream.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open submission review in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildEvaluationAssignmentEmail(
  payload: EvaluationAssignmentEmailPayload,
): EmailMessage {
  const actionLine = payload.actionUrl
    ? `\n\nOpen in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'evaluation_assignment',
    subject: `FOASIS: Evaluation assignment — ${payload.deliverableTitle}`,
    text: [
      `You have been assigned an evaluation on FOASIS.`,
      '',
      `Deliverable: ${payload.deliverableTitle}`,
      ...(payload.teamName ? [`Team: ${payload.teamName}`] : []),
      ...(payload.phaseName ? [`Phase: ${payload.phaseName}`] : []),
      `Details: ${payload.evaluationLabel}`,
      '',
      'Please complete the evaluation when ready.',
      actionLine,
    ].join('\n'),
    html: `
      <p>You have been assigned an evaluation on FOASIS.</p>
      <ul>
        <li><strong>Deliverable:</strong> ${payload.deliverableTitle}</li>
        ${
          payload.teamName
            ? `<li><strong>Team:</strong> ${payload.teamName}</li>`
            : ''
        }
        ${
          payload.phaseName
            ? `<li><strong>Phase:</strong> ${payload.phaseName}</li>`
            : ''
        }
        <li><strong>Details:</strong> ${payload.evaluationLabel}</li>
      </ul>
      <p>Please complete the evaluation when ready.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open evaluation in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildEvaluationReminderEmail(
  payload: EvaluationReminderEmailPayload,
): EmailMessage {
  const actionLine = payload.actionUrl
    ? `\n\nOpen in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'evaluation_reminder',
    subject: `FOASIS: Evaluation reminder — ${payload.deliverableTitle}`,
    text: [
      `This is a reminder to complete your pending evaluation on FOASIS.`,
      '',
      `Deliverable: ${payload.deliverableTitle}`,
      `Team: ${payload.teamName}`,
      ...(payload.phaseName ? [`Phase: ${payload.phaseName}`] : []),
      `Status: ${payload.statusLabel}`,
      '',
      'Please complete the evaluation when ready.',
      actionLine,
    ].join('\n'),
    html: `
      <p>This is a reminder to complete your pending evaluation on FOASIS.</p>
      <ul>
        <li><strong>Deliverable:</strong> ${payload.deliverableTitle}</li>
        <li><strong>Team:</strong> ${payload.teamName}</li>
        ${
          payload.phaseName
            ? `<li><strong>Phase:</strong> ${payload.phaseName}</li>`
            : ''
        }
        <li><strong>Status:</strong> ${payload.statusLabel}</li>
      </ul>
      <p>Please complete the evaluation when ready.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open evaluation in FOASIS</a></p>`
          : ''
      }
    `,
  };
}

export function buildDeliverableTemplateAvailableEmail(
  payload: DeliverableTemplateAvailableEmailPayload,
): EmailMessage {
  const dueText = payload.dueDate
    ? payload.dueDate.toLocaleString()
    : 'Not set';
  const description = payload.description?.trim() || 'No description provided.';
  const actionLine = payload.actionUrl
    ? `\n\nOpen in FOASIS: ${payload.actionUrl}`
    : '';

  return {
    to: payload.to,
    type: 'deliverable_template_available',
    subject: `FOASIS: New deliverable template — ${payload.deliverableTitle}`,
    text: [
      `A new deliverable template is available for you to publish to your teams.`,
      '',
      `Title: ${payload.deliverableTitle}`,
      `Phase: ${payload.phaseName}`,
      `Due date: ${dueText}`,
      `Description: ${description}`,
      '',
      'Publish it from your work stream when ready.',
      actionLine,
    ].join('\n'),
    html: `
      <p>A new deliverable template is available for you to publish to your teams.</p>
      <ul>
        <li><strong>Title:</strong> ${payload.deliverableTitle}</li>
        <li><strong>Phase:</strong> ${payload.phaseName}</li>
        <li><strong>Due date:</strong> ${dueText}</li>
        <li><strong>Description:</strong> ${description}</li>
      </ul>
      <p>Publish it from your work stream when ready.</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">Open deliverable templates in FOASIS</a></p>`
          : ''
      }
    `,
  };
}
