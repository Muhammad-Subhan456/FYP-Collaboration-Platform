export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

export function buildInvitationEmail(
  payload: InvitationEmailPayload,
): EmailMessage {
  const expiresText = payload.expiresAt.toLocaleString();

  return {
    to: payload.to,
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
    subject: `FOASIS Announcement: ${payload.title}`,
    text: `${payload.title}\n\n${payload.message}${actionLine}`,
    html: `
      <p><strong>${payload.title}</strong></p>
      <p>${payload.message.replace(/\n/g, '<br/>')}</p>
      ${
        payload.actionUrl
          ? `<p><a href="${payload.actionUrl}">View announcement in FOASIS</a></p>`
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
