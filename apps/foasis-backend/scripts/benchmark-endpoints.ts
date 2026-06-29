/**
 * System-wide FOASIS endpoint benchmark.
 *
 * Usage:
 *   npm run benchmark
 *
 * Optional env:
 *   BENCHMARK_ITERATIONS=3
 *   BENCHMARK_STUDENT_ID, BENCHMARK_SUPERVISOR_ID, BENCHMARK_COORDINATOR_ID
 */

import { loadEnv } from './lib/load-env';

loadEnv();

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { runWithQueryPerf } from '../src/common/performance/query-perf';
import { PrismaService } from '../src/prisma/prisma.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { StudentPagesService } from '../src/student/student-pages.service';
import { EvaluationPanelsService } from '../src/progress/evaluation-panels/evaluation-panels.service';
import { EvaluationResultsService } from '../src/progress/evaluation-results/evaluation-results.service';
import { EvaluationsService } from '../src/progress/evaluations/evaluations.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { ProfilesService } from '../src/users/profiles.service';
import { ProposalsService } from '../src/proposals/proposals.service';
import { DeliverablesService } from '../src/progress/deliverables/deliverables.service';

type BenchmarkCase = {
  module: string;
  name: string;
  run: () => Promise<unknown>;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function benchmarkCase(
  iterations: number,
  fn: () => Promise<{
    result: unknown;
    perf: { queryCount: number; totalDbMs: number };
  }>,
) {
  const totals: number[] = [];
  const queryCounts: number[] = [];
  const dbTotals: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const started = performance.now();
    const { perf } = await fn();
    totals.push(performance.now() - started);
    queryCounts.push(perf.queryCount);
    dbTotals.push(perf.totalDbMs);
  }

  return {
    totalMs: median(totals),
    queryCount: median(queryCounts),
    dbMs: median(dbTotals),
  };
}

async function resolveUserId(
  prisma: PrismaService,
  role: 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR',
  envKey: string,
) {
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    return fromEnv;
  }

  const user = await prisma.user.findFirst({
    where: { role, isActive: true },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function main() {
  const iterations = Number(
    process.env.BENCHMARK_ITERATIONS ?? 3,
  );

  const app = await NestFactory.createApplicationContext(
    AppModule,
    { logger: false },
  );

  const prisma = app.get(PrismaService);
  const dashboardService = app.get(DashboardService);
  const studentPagesService = app.get(StudentPagesService);
  const evaluationPanelsService = app.get(
    EvaluationPanelsService,
  );
  const evaluationResultsService = app.get(
    EvaluationResultsService,
  );
  const evaluationsService = app.get(EvaluationsService);
  const notificationsService = app.get(NotificationsService);
  const profilesService = app.get(ProfilesService);
  const proposalsService = app.get(ProposalsService);
  const deliverablesService = app.get(DeliverablesService);

  const studentId = await resolveUserId(
    prisma,
    'STUDENT',
    'BENCHMARK_STUDENT_ID',
  );
  const supervisorId = await resolveUserId(
    prisma,
    'SUPERVISOR',
    'BENCHMARK_SUPERVISOR_ID',
  );
  const coordinatorId = await resolveUserId(
    prisma,
    'COORDINATOR',
    'BENCHMARK_COORDINATOR_ID',
  );

  const cases: BenchmarkCase[] = [];

  if (studentId) {
    cases.push(
      {
        module: 'Student',
        name: 'Dashboard',
        run: () =>
          dashboardService.getStudentOverview(studentId),
      },
      {
        module: 'Student',
        name: 'Deliverables',
        run: () =>
          studentPagesService.getDeliverables(studentId),
      },
      {
        module: 'Student',
        name: 'Notifications',
        run: () =>
          studentPagesService.getNotifications(studentId),
      },
      {
        module: 'Student',
        name: 'Profile',
        run: () =>
          studentPagesService.getProfile(studentId),
      },
      {
        module: 'Student',
        name: 'Submissions',
        run: () =>
          studentPagesService.getSubmissions(studentId),
      },
    );
  }

  if (supervisorId) {
    cases.push(
      {
        module: 'Supervisor',
        name: 'Dashboard',
        run: () =>
          dashboardService.getSupervisorOverview(
            supervisorId,
          ),
      },
      {
        module: 'Supervisor',
        name: 'Deliverables',
        run: () =>
          deliverablesService.getMyDeliverables(
            supervisorId,
          ),
      },
      {
        module: 'Supervisor',
        name: 'Review Queue',
        run: () =>
          proposalsService.getSupervisorReviewQueue(
            supervisorId,
          ),
      },
      {
        module: 'Supervisor',
        name: 'Supervised Teams',
        run: () =>
          proposalsService.getSupervisedProposals(
            supervisorId,
          ),
      },
      {
        module: 'Evaluator',
        name: 'My Panels',
        run: () =>
          evaluationPanelsService.getMyPanels(
            supervisorId,
          ),
      },
      {
        module: 'Supervisor',
        name: 'Notifications',
        run: () =>
          notificationsService.getMyNotifications(
            supervisorId,
            1,
            20,
          ),
      },
      {
        module: 'Supervisor',
        name: 'Profile',
        run: () =>
          profilesService.getMyProfile(supervisorId),
      },
    );
  }

  if (coordinatorId) {
    cases.push(
      {
        module: 'Coordinator',
        name: 'Dashboard',
        run: () =>
          dashboardService.getCoordinatorOverview(
            coordinatorId,
          ),
      },
      {
        module: 'Coordinator',
        name: 'Results Overview',
        run: () =>
          evaluationResultsService.getCoordinatorOverview(),
      },
      {
        module: 'Coordinator',
        name: 'Evaluator Overview',
        run: () =>
          evaluationsService.getEvaluatorOverview(),
      },
      {
        module: 'Coordinator',
        name: 'Notifications',
        run: () =>
          notificationsService.getMyNotifications(
            coordinatorId,
            1,
            20,
          ),
      },
      {
        module: 'Coordinator',
        name: 'Profile',
        run: () =>
          profilesService.getMyProfile(coordinatorId),
      },
    );
  }

  if (cases.length === 0) {
    console.error('No benchmark users found in database.');
    await app.close();
    process.exit(1);
  }

  console.log(
    `\nFOASIS system benchmark (${iterations} iterations)\n`,
  );
  console.log(
    [
      'Module'.padEnd(14),
      'Endpoint'.padEnd(22),
      'Total(ms)'.padStart(10),
      'Queries'.padStart(9),
      'DB(ms)'.padStart(10),
    ].join(''),
  );
  console.log('-'.repeat(67));

  for (const testCase of cases) {
    const result = await benchmarkCase(iterations, () =>
      runWithQueryPerf(testCase.run),
    );

    console.log(
      [
        testCase.module.padEnd(14),
        testCase.name.padEnd(22),
        result.totalMs.toFixed(1).padStart(10),
        String(Math.round(result.queryCount)).padStart(9),
        result.dbMs.toFixed(1).padStart(10),
      ].join(''),
    );
  }

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
