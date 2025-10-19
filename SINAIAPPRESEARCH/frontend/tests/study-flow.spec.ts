import { test, expect } from '@playwright/test';

const apiBase = 'http://localhost:4000/v1';

const routes = {
  listStudies: `${apiBase}/studies`,
  createStudy: `${apiBase}/studies`,
  studyDetail: `${apiBase}/studies/mock-study-id`,
  assignments: `${apiBase}/assignments`,
  tasks: `${apiBase}/tasks`,
  budgetLine: `${apiBase}/budgets/lines`,
  budgets: `${apiBase}/budgets`,
  metaStudyTypes: `${apiBase}/meta/study-types`,
  metaPeople: `${apiBase}/meta/people`,
  metaRoles: `${apiBase}/meta/roles`,
  irbTransition: `${apiBase}/irb/transition`,
  irbPath: `${apiBase}/irb/mock-study-id/path`,
};

const studyTypes = [
  { id: 'drug_ind', name: 'Drug (IND)' },
  { id: 'behavioral', name: 'Behavioral' },
];

const people = [
  { id: 'u_pi_lee', name: 'Dr. Pat Lee', email: 'p.lee@example.edu', roles: ['pi'] },
  { id: 'u_coord_rivera', name: 'Alex Rivera', email: 'a.rivera@example.edu', roles: ['coordinator'] },
];

const roles = [
  { id: 'pi', name: 'Principal Investigator' },
  { id: 'coordinator', name: 'Study Coordinator' },
];

const mockStudyList = [
  {
    id: 'omega-3',
    title: 'Omega-3 in Mild Cognitive Impairment',
    shortTitle: 'Omega MCI',
    type: studyTypes[0],
    riskLevel: 'MORE_THAN_MINIMAL',
    status: 'SUBMITTED_TO_IRB',
    sponsorName: 'Acme Pharma',
    principalInvestigator: people[0],
    isMultiSite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockStudyDetail = {
  ...mockStudyList[0],
  id: 'mock-study-id',
  assignments: [
    {
      id: 'assign-1',
      studyId: 'mock-study-id',
      personId: people[0].id,
      roleId: 'pi',
      effortPercent: 10,
      hoursPerWeek: 4,
      startDate: '2025-01-01',
      endDate: null,
      person: people[0],
      role: roles[0],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      studyId: 'mock-study-id',
      title: 'Draft protocol',
      description: 'Complete protocol draft',
      status: 'PENDING',
      dueAt: '2025-02-01',
    },
  ],
  budget: {
    id: 'budget-1',
    studyId: 'mock-study-id',
    currency: 'USD',
    totalDirect: 25000,
    totalIndirect: 5000,
    startDate: '2025-01-01',
    endDate: null,
    lines: [
      {
        id: 'line-1',
        budgetId: 'budget-1',
        category: 'Personnel',
        amount: 20000,
        personId: people[1].id,
        note: 'Coordinator effort',
        person: people[1],
      },
    ],
  },
  irbSubmission: {
    id: 'irb-1',
    studyId: 'mock-study-id',
    currentStatus: 'PRE_REVIEW',
    path: 'EXPEDITED',
    expeditedCategory: 'Category 5',
    submittedAt: '2025-01-05',
    meetingDate: null,
    determinedAt: null,
    continuingReviewRequired: false,
    statusHistory: [
      {
        id: 'hist-1',
        irbSubmissionId: 'irb-1',
        fromStatus: null,
        toStatus: 'DRAFT',
        note: null,
        actorId: null,
        createdAt: '2025-01-02',
      },
      {
        id: 'hist-2',
        irbSubmissionId: 'irb-1',
        fromStatus: 'DRAFT',
        toStatus: 'PRE_REVIEW',
        note: 'Assigned to reviewer',
        actorId: 'user-1',
        createdAt: '2025-01-10',
      },
    ],
  },
  documents: [],
  sites: [
    { id: 'site-1', name: 'Main Hospital Campus', isInternal: true },
  ],
};

const createdStudy = {
  ...mockStudyDetail,
  title: 'New Heart Study',
  shortTitle: 'Heart Study',
};

const assignmentsForStudy = mockStudyDetail.assignments;
const tasksForStudy = mockStudyDetail.tasks;

let currentStudyDetail = mockStudyDetail;
let currentAssignments = assignmentsForStudy;
let currentTasks = tasksForStudy;
let currentBudget = mockStudyDetail.budget;

const respond = (route, data, status = 200) =>
  route.fulfill({
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

test.describe('Study orchestration flow (mocked backend)', () => {
  test('study directory → creation → workspace', async ({ page }) => {
    await page.route(routes.metaStudyTypes, (route) => respond(route, studyTypes));
    await page.route(routes.metaPeople, (route) => respond(route, people));
    await page.route(routes.metaRoles, (route) => respond(route, roles));

    await page.route('**/v1/meta/study-types', (route) => respond(route, studyTypes));
    await page.route('**/v1/meta/people', (route) => respond(route, people));
    await page.route('**/v1/meta/roles', (route) => respond(route, roles));

    await page.route('**/v1/studies', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        return respond(route, mockStudyList);
      }
      if (request.method() === 'POST') {
        const payload = await request.postDataJSON();
        currentStudyDetail = {
          ...createdStudy,
          id: 'mock-study-id',
          title: payload.title,
          shortTitle: payload.shortTitle ?? createdStudy.shortTitle,
          sponsorName: payload.sponsorName ?? createdStudy.sponsorName,
          type: studyTypes.find((type) => type.id === payload.typeId) ?? studyTypes[0],
          principalInvestigator: people.find((person) => person.id === payload.piId) ?? people[0],
          assignments: currentAssignments,
          tasks: currentTasks,
          budget: currentBudget,
        };
        return respond(route, currentStudyDetail, 201);
      }
      return route.continue();
    });

    await page.route('**/v1/studies/mock-study-id', (route) => respond(route, currentStudyDetail));

    await page.route('**/v1/assignments', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        return respond(route, assignmentsForStudy);
      }
      if (request.method() === 'POST') {
        return respond(route, {
          id: 'assign-new',
          studyId: 'mock-study-id',
          personId: people[1].id,
          roleId: 'coordinator',
          startDate: '2025-01-01',
          endDate: null,
          effortPercent: 20,
          hoursPerWeek: 8,
          person: people[1],
          role: roles[1],
        }, 201);
      }
      return route.continue();
    });

    await page.route('**/v1/tasks', (route) => {
      if (route.request().method() === 'GET') {
        return respond(route, currentTasks);
      }
      return route.continue();
    });
    await page.route('**/v1/tasks/*', (route) => {
      if (route.request().method() === 'PATCH') {
        currentTasks = currentTasks.map((task) => ({ ...task, status: 'COMPLETED' }));
        currentStudyDetail = { ...currentStudyDetail, tasks: currentTasks };
        return respond(route, currentTasks[0]);
      }
      return route.continue();
    });

    await page.route('**/v1/budgets', (route) => {
      if (route.request().method() === 'POST') {
        currentBudget = currentBudget ?? {
          id: 'budget-1',
          studyId: 'mock-study-id',
          currency: 'USD',
          totalDirect: 0,
          totalIndirect: 0,
          startDate: null,
          endDate: null,
          lines: [],
        };
        currentStudyDetail = { ...currentStudyDetail, budget: currentBudget };
        return respond(route, currentBudget);
      }
      return route.continue();
    });

    await page.route('**/v1/budgets/lines', (route) => {
      if (route.request().method() === 'POST') {
        const newLine = {
          id: 'line-1',
          budgetId: currentBudget?.id ?? 'budget-1',
          category: 'Supplies',
          amount: 1000,
          personId: null,
          note: 'Initial supplies',
        };
        currentBudget = currentBudget
          ? { ...currentBudget, lines: [...currentBudget.lines, newLine] }
          : { id: 'budget-1', studyId: 'mock-study-id', currency: 'USD', totalDirect: 0, totalIndirect: 0, startDate: null, endDate: null, lines: [newLine] };
        currentStudyDetail = { ...currentStudyDetail, budget: currentBudget };
        return respond(route, newLine, 201);
      }
      return route.continue();
    });

    await page.route('**/v1/irb/transition', (route) => {
      if (route.request().method() === 'POST') {
        return respond(route, { ...mockStudyDetail.irbSubmission, currentStatus: 'APPROVED' });
      }
      return route.continue();
    });

    await page.route('**/v1/irb/mock-study-id/path', (route) => {
      if (route.request().method() === 'PATCH') {
        return respond(route, { ...mockStudyDetail.irbSubmission, path: 'CONVENED' });
      }
      return route.continue();
    });

    await page.goto('/studies');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Active studies' })).toBeVisible();
    await expect(page.getByText('Omega-3 in Mild Cognitive Impairment')).toBeVisible();

    await page.getByRole('button', { name: 'New Study' }).click();
    const modal = page.locator('#create-study-form');
    await modal.getByLabel('Title', { exact: true }).fill('New Heart Study');
    await modal.getByLabel('Short title').fill('Heart Study');
    await modal.getByLabel('Sponsor').fill('Wellness Labs');
    await modal.getByLabel('Risk level').selectOption('MINIMAL');
    await modal.getByLabel('Principal Investigator').selectOption(people[0].id);
    await page.getByRole('button', { name: 'Create study' }).click();

    await expect(page).toHaveURL(/studies\/mock-study-id/);
    await expect(page.getByRole('heading', { name: 'New Heart Study' })).toBeVisible();
    await expect(page.getByText('PI: Dr. Pat Lee')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Study team' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Task list' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'IRB status' })).toBeVisible();
  });
});
