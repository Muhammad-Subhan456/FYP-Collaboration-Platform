/**
 * Backfill StudentPhaseResult rows using the current GPA calculation rules.
 * Run: node scripts/recalculate-gpa.js
 */
const { PrismaClient, SubmissionEvaluationStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateGpa(percentage) {
  if (percentage >= 85) return 4.0;
  if (percentage >= 80) return 3.7;
  if (percentage >= 75) return 3.3;
  if (percentage >= 70) return 3.0;
  if (percentage >= 65) return 2.7;
  if (percentage >= 60) return 2.3;
  if (percentage >= 55) return 2.0;
  if (percentage >= 50) return 1.7;
  return 0.0;
}

function averageTemplateScoreForStudent(evaluations, studentId) {
  const totals = evaluations
    .filter((evaluation) => evaluation.status === SubmissionEvaluationStatus.SUBMITTED)
    .map(
      (evaluation) =>
        evaluation.studentScores.find((score) => score.studentId === studentId)
          ?.totalMarks,
    )
    .filter((value) => value !== undefined);

  if (!totals.length) {
    return null;
  }

  return (
    Math.round(
      (totals.reduce((sum, value) => sum + value, 0) / totals.length) * 100,
    ) / 100
  );
}

async function recalculateForStudentPhase(workspaceId, phaseId, studentId) {
  const phase = await prisma.phase.findFirst({
    where: { id: phaseId, workspaceId },
    include: {
      templates: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          weightagePercent: true,
        },
      },
    },
  });

  if (!phase) return null;

  const teamMember = await prisma.teamMember.findFirst({
    where: { authUserId: studentId, team: { workspaceId } },
    select: { teamId: true },
  });
  if (!teamMember) return null;

  const teamDeliverables = await prisma.deliverable.findMany({
    where: {
      workspaceId,
      phaseId,
      teamId: teamMember.teamId,
      templateId: { not: null },
      isActive: true,
    },
    select: { templateId: true },
  });

  const applicableTemplateIds = new Set(
    teamDeliverables
      .map((d) => d.templateId)
      .filter(Boolean),
  );

  const applicableTemplates = phase.templates.filter((t) =>
    applicableTemplateIds.has(t.id),
  );
  if (!applicableTemplates.length) return null;

  const templatesWithWeight = applicableTemplates.filter(
    (t) => Number(t.weightagePercent) > 0,
  );
  const useEqualWeights = templatesWithWeight.length === 0;
  const templates = useEqualWeights
    ? applicableTemplates
    : templatesWithWeight;

  const evaluations = await prisma.submissionEvaluation.findMany({
    where: {
      workspaceId,
      teamId: teamMember.teamId,
      templateId: { in: templates.map((t) => t.id) },
    },
    include: {
      studentScores: { where: { studentId } },
    },
  });

  const byTemplate = new Map();
  for (const evaluation of evaluations) {
    const list = byTemplate.get(evaluation.templateId) ?? [];
    list.push(evaluation);
    byTemplate.set(evaluation.templateId, list);
  }

  const equalWeight = templates.length > 0 ? 100 / templates.length : 0;
  const breakdown = templates.map((template) => {
    const configuredWeight = Number(template.weightagePercent);
    const effectiveWeight = useEqualWeights ? equalWeight : configuredWeight;
    const templateEvaluations = byTemplate.get(template.id) ?? [];
    const averaged = averageTemplateScoreForStudent(
      templateEvaluations,
      studentId,
    );
    const studentMarks = averaged ?? 0;
    const submittedEvaluatorCount = templateEvaluations.filter(
      (item) => item.status === SubmissionEvaluationStatus.SUBMITTED,
    ).length;
    const percentage =
      template.totalMarks > 0
        ? (studentMarks / template.totalMarks) * 100
        : 0;
    const weightedContribution = (percentage * effectiveWeight) / 100;

    return {
      templateId: template.id,
      deliverableTitle: template.title,
      totalMarks: template.totalMarks,
      weightagePercent: configuredWeight,
      effectiveWeightPercent: Math.round(effectiveWeight * 100) / 100,
      studentMarks,
      percentage: Math.round(percentage * 100) / 100,
      weightedContribution: Math.round(weightedContribution * 100) / 100,
      evaluationStatus:
        submittedEvaluatorCount > 0 ? 'SUBMITTED' : 'PENDING',
      evaluatorCount: templateEvaluations.length,
      submittedEvaluatorCount,
    };
  });

  const isComplete =
    breakdown.length > 0 &&
    breakdown.every((item) => item.evaluationStatus === 'SUBMITTED');
  const totalEffectiveWeight = breakdown.reduce(
    (sum, item) => sum + item.effectiveWeightPercent,
    0,
  );
  const rawWeightedSum = breakdown.reduce(
    (sum, item) => sum + item.weightedContribution,
    0,
  );
  const phasePercentage =
    totalEffectiveWeight > 0
      ? (rawWeightedSum / totalEffectiveWeight) * 100
      : 0;
  const roundedMarks = Math.round(phasePercentage * 100) / 100;
  const gpa =
    isComplete ? calculateGpa(roundedMarks) : 0;

  return prisma.studentPhaseResult.upsert({
    where: { phaseId_studentId: { phaseId, studentId } },
    create: {
      workspaceId,
      phaseId,
      studentId,
      weightedMarks: roundedMarks,
      gpa,
      isComplete,
      breakdown,
    },
    update: {
      weightedMarks: roundedMarks,
      gpa,
      isComplete,
      breakdown,
      calculatedAt: new Date(),
    },
  });
}

(async () => {
  const members = await prisma.teamMember.findMany({
    include: { team: { select: { workspaceId: true } } },
  });

  const phases = await prisma.phase.findMany({
    select: { id: true, workspaceId: true, name: true },
  });

  let updated = 0;
  for (const phase of phases) {
    const students = members
      .filter((m) => m.team.workspaceId === phase.workspaceId)
      .map((m) => m.authUserId);
    const uniqueStudents = [...new Set(students)];

    for (const studentId of uniqueStudents) {
      const result = await recalculateForStudentPhase(
        phase.workspaceId,
        phase.id,
        studentId,
      );
      if (result) {
        updated += 1;
        console.log(
          `${phase.name} | ${studentId.slice(0, 8)} | marks=${result.weightedMarks} | gpa=${result.gpa} | complete=${result.isComplete}`,
        );
      }
    }
  }

  console.log(`Recalculated ${updated} student phase results`);
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
