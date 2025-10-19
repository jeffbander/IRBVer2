import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addBudgetLine,
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchPeople,
  fetchRoles,
  fetchStudyDetail,
  fetchTasks,
  transitionIRBStatus,
  updateIRBPath,
  updateStudy,
  updateTaskStatus,
  upsertBudget,
} from '../api/studies';
import type {
  IRBPath,
  IRBStatus,
  Person,
  Role,
  StudyDetail,
  StudyAssignment,
  Budget,
  Task,
} from '../types/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { StatusPill } from '../components/StatusPill';
import './StudyDetailPage.css';

const irbTransitions: Record<IRBStatus, IRBStatus[]> = {
  DRAFT: ['READY_TO_SUBMIT'],
  READY_TO_SUBMIT: ['SUBMITTED'],
  SUBMITTED: ['PRE_REVIEW'],
  PRE_REVIEW: ['MODIFICATIONS_REQUESTED', 'EXEMPT_DETERMINATION', 'EXPEDITED_APPROVED', 'MEETING_SCHEDULED', 'NOT_APPROVED'],
  MODIFICATIONS_REQUESTED: ['RESUBMITTED'],
  RESUBMITTED: ['PRE_REVIEW'],
  EXEMPT_DETERMINATION: [],
  EXPEDITED_APPROVED: [],
  MEETING_SCHEDULED: ['APPROVED', 'CONDITIONALLY_APPROVED', 'DEFERRED', 'NOT_APPROVED'],
  APPROVED: [],
  CONDITIONALLY_APPROVED: ['APPROVED'],
  DEFERRED: ['MEETING_SCHEDULED'],
  NOT_APPROVED: [],
};

const irbStatusLabels: Record<IRBStatus, string> = {
  DRAFT: 'Draft',
  READY_TO_SUBMIT: 'Ready to submit',
  SUBMITTED: 'Submitted to IRB',
  PRE_REVIEW: 'IRB pre-review',
  MODIFICATIONS_REQUESTED: 'Modifications requested',
  RESUBMITTED: 'Resubmitted',
  EXEMPT_DETERMINATION: 'Exempt determination',
  EXPEDITED_APPROVED: 'Approved (expedited)',
  MEETING_SCHEDULED: 'Meeting scheduled',
  APPROVED: 'Approved',
  CONDITIONALLY_APPROVED: 'Conditionally approved',
  DEFERRED: 'Deferred',
  NOT_APPROVED: 'Not approved',
};

export const StudyDetailPage = () => {
  const { studyId = '' } = useParams<{ studyId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const studyQuery = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => fetchStudyDetail(studyId),
    enabled: Boolean(studyId),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', studyId],
    queryFn: () => fetchAssignments(studyId),
    enabled: Boolean(studyId),
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', studyId],
    queryFn: () => fetchTasks(studyId),
    enabled: Boolean(studyId),
  });

  const peopleQuery = useQuery({ queryKey: ['people'], queryFn: fetchPeople });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });

  const updateStudyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateStudy>[1] }) =>
      updateStudy(id, payload),
    onSuccess: (study) => {
      queryClient.setQueryData(['study', studyId], study);
      queryClient.invalidateQueries({ queryKey: ['studies'] });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', studyId] });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments', studyId] }),
  });

  const upsertBudgetMutation = useMutation({
    mutationFn: upsertBudget,
    onSuccess: (budget) => {
      queryClient.setQueryData(['study', studyId], (prev?: StudyDetail) => (prev ? { ...prev, budget } : prev));
    },
  });

  const addBudgetLineMutation = useMutation({
    mutationFn: addBudgetLine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study', studyId] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task['status'] }) => updateTaskStatus(taskId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', studyId] }),
  });

  const transitionIrbMutation = useMutation({
    mutationFn: transitionIRBStatus,
    onSuccess: (submission) => {
      queryClient.setQueryData(['study', studyId], (prev?: StudyDetail) =>
        prev ? { ...prev, irbSubmission: submission } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ['study', studyId] });
    },
  });

  const updateIrbPathMutation = useMutation({
    mutationFn: ({ studyId, path }: { studyId: string; path: IRBPath }) => updateIRBPath(studyId, path),
    onSuccess: (submission) => {
      queryClient.setQueryData(['study', studyId], (prev?: StudyDetail) =>
        prev ? { ...prev, irbSubmission: submission } : prev,
      );
    },
  });

  if (studyQuery.isLoading) {
    return <div className="page-loader">Loading study workspace…</div>;
  }

  if (!studyQuery.data) {
    return (
      <div className="page-loader">
        <p>Study not found. <button onClick={() => navigate('/studies')}>Back to directory</button></p>
      </div>
    );
  }

  const study = studyQuery.data;
  const assignments = assignmentsQuery.data ?? study.assignments ?? [];
  const tasks = tasksQuery.data ?? study.tasks ?? [];
  const budget = study.budget ?? null;
  const people = peopleQuery.data ?? [];
  const roles = rolesQuery.data ?? [];


  const allowedTransitions = study.irbSubmission
    ? irbTransitions[study.irbSubmission.currentStatus]
    : irbTransitions.DRAFT;

  return (
    <section className="study-detail">
      <header className="study-detail__header">
        <div>
          <button className="back-link" onClick={() => navigate('/studies')}>&larr; All studies</button>
          <h1>{study.title}</h1>
          <div className="study-meta-row">
            <StatusPill label={irbStatusLabels[(study.irbSubmission?.currentStatus ?? 'DRAFT')]} tone="info" />
            <span>PI: {study.principalInvestigator.name}</span>
            <span>Type: {study.type.name}</span>
            <span>Risk: {study.riskLevel === 'MINIMAL' ? 'Minimal' : 'More than minimal'}</span>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            updateStudyMutation.mutate({
              id: study.id,
              payload: {
                shortTitle: study.shortTitle ?? undefined,
                sponsorName: study.sponsorName ?? undefined,
                typeId: study.type.id,
                piId: study.principalInvestigator.id,
                riskLevel: study.riskLevel,
                sites: study.sites.map((site) => ({ name: site.name, isInternal: site.isInternal })),
              },
            })
          }
          disabled={updateStudyMutation.isPending}
          title="Stub action until inline editing is implemented"
        >
          Save details
        </Button>
      </header>

      <div className="study-panels">
        <section className="panel">
          <h2>Summary</h2>
          <dl>
            <div>
              <dt>Short title</dt>
              <dd>{study.shortTitle || '—'}</dd>
            </div>
            <div>
              <dt>Sponsor</dt>
              <dd>{study.sponsorName || '—'}</dd>
            </div>
            <div>
              <dt>Sites</dt>
              <dd>{study.sites.map((site) => site.name).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(study.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <AssignmentsPanel
          studyId={studyId}
          assignments={assignments}
          people={people}
          roles={roles}
          onCreate={(payload) => createAssignmentMutation.mutate(payload)}
          onDelete={(id) => deleteAssignmentMutation.mutate(id)}
          isProcessing={createAssignmentMutation.isPending || deleteAssignmentMutation.isPending}
        />

        <BudgetPanel
          studyId={studyId}
          budget={budget}
          onUpsert={upsertBudgetMutation.mutate}
          onAddLine={addBudgetLineMutation.mutate}
          isProcessing={upsertBudgetMutation.isPending || addBudgetLineMutation.isPending}
          people={people}
        />

        <TasksPanel
          tasks={tasks}
          onUpdateStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, status })}
          isProcessing={updateTaskMutation.isPending}
        />

        <IRBPanel
          studyId={studyId}
          submission={study.irbSubmission ?? null}
          allowedTransitions={allowedTransitions}
          onTransition={(payload) => transitionIrbMutation.mutate(payload)}
          onPathChange={(path) => updateIrbPathMutation.mutate({ studyId, path })}
          isProcessing={transitionIrbMutation.isPending || updateIrbPathMutation.isPending}
        />
      </div>
    </section>
  );
};

interface AssignmentsPanelProps {
  studyId: string;
  assignments: StudyAssignment[];
  people: Person[];
  roles: Role[];
  onCreate: (payload: Parameters<typeof createAssignment>[0]) => void;
  onDelete: (assignmentId: string) => void;
  isProcessing: boolean;
}

const AssignmentsPanel = ({
  studyId,
  assignments,
  people,
  roles,
  onCreate,
  onDelete,
  isProcessing,
}: AssignmentsPanelProps) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    personId: '',
    roleId: '',
    effortPercent: '',
    hoursPerWeek: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  const availablePeople = useMemo(() => people.filter((person) => person.roles.length), [people]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.personId || !form.roleId) return;
    onCreate({
      studyId,
      personId: form.personId,
      roleId: form.roleId,
      effortPercent: form.effortPercent ? Number(form.effortPercent) : undefined,
      hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
    });
    setShowModal(false);
    setForm({
      personId: '',
      roleId: '',
      effortPercent: '',
      hoursPerWeek: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
    });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Study team</h2>
        <Button variant="secondary" onClick={() => setShowModal(true)}>
          Add assignment
        </Button>
      </header>
      <div className="panel-table">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Effort %</th>
              <th>Hours/week</th>
              <th>Dates</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>{assignment.person?.name ?? assignment.personId}</td>
                <td>{assignment.role?.name ?? assignment.roleId}</td>
                <td>{assignment.effortPercent ?? '—'}</td>
                <td>{assignment.hoursPerWeek ?? '—'}</td>
                <td>
                  {new Date(assignment.startDate).toLocaleDateString()} →{' '}
                  {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button className="link" onClick={() => onDelete(assignment.id)} disabled={isProcessing}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title="Assign team member"
        open={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="assignment-form" disabled={isProcessing}>
              Save
            </Button>
          </div>
        }
      >
        <form id="assignment-form" className="stack" onSubmit={handleSubmit}>
          <Select
            label="Person"
            value={form.personId}
            onChange={(event) => setForm((prev) => ({ ...prev, personId: event.target.value }))}
            required
          >
            <option value="">Select person…</option>
            {availablePeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          <Select
            label="Role"
            value={form.roleId}
            onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
            required
          >
            <option value="">Select role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <div className="grid-two">
            <Input
              label="Effort %"
              type="number"
              min={0}
              max={100}
              value={form.effortPercent}
              onChange={(event) => setForm((prev) => ({ ...prev, effortPercent: event.target.value }))}
            />
            <Input
              label="Hours per week"
              type="number"
              min={0}
              value={form.hoursPerWeek}
              onChange={(event) => setForm((prev) => ({ ...prev, hoursPerWeek: event.target.value }))}
            />
          </div>
          <div className="grid-two">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </section>
  );
};

interface BudgetPanelProps {
  studyId: string;
  budget: Budget | null;
  onUpsert: (payload: Parameters<typeof upsertBudget>[0]) => void;
  onAddLine: (payload: Parameters<typeof addBudgetLine>[0]) => void;
  isProcessing: boolean;
  people: Person[];
}

const BudgetPanel = ({ studyId, budget, onUpsert, onAddLine, isProcessing, people }: BudgetPanelProps) => {
  const [showModal, setShowModal] = useState(false);
  const [line, setLine] = useState({ category: '', amount: '', personId: '', note: '' });
  const [summary, setSummary] = useState({
    totalDirect: budget?.totalDirect?.toString() ?? '',
    totalIndirect: budget?.totalIndirect?.toString() ?? '',
    currency: budget?.currency ?? 'USD',
  });

  useEffect(() => {
    setSummary({
      totalDirect: budget?.totalDirect?.toString() ?? '',
      totalIndirect: budget?.totalIndirect?.toString() ?? '',
      currency: budget?.currency ?? 'USD',
    });
  }, [budget]);

  const hasBudget = Boolean(budget);

  const handleSummarySave = () => {
    onUpsert({
      studyId,
      currency: summary.currency || 'USD',
      totalDirect: summary.totalDirect ? Number(summary.totalDirect) : undefined,
      totalIndirect: summary.totalIndirect ? Number(summary.totalIndirect) : undefined,
    });
  };

  const handleAddLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!budget) return;
    if (!line.category || !line.amount) return;
    onAddLine({
      budgetId: budget.id,
      category: line.category,
      amount: Number(line.amount),
      personId: line.personId || undefined,
      note: line.note || undefined,
    });
    setShowModal(false);
    setLine({ category: '', amount: '', personId: '', note: '' });
  };

  const totalLines = (budget?.lines ?? []).reduce((acc, item) => acc + item.amount, 0);

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Budget</h2>
        <div className="panel-actions">
          <Button variant="secondary" onClick={() => setShowModal(true)} disabled={!hasBudget}>
            Add line
          </Button>
          <Button variant="primary" onClick={handleSummarySave} disabled={isProcessing}>
            {hasBudget ? 'Save summary' : 'Create budget shell'}
          </Button>
        </div>
      </header>
      {!hasBudget && (
        <div className="info-callout">
          <strong>No budget yet.</strong> Click 'Create budget shell' to start tracking totals, then add line items.
        </div>
      )}
      <div className="budget-summary">
        <Input
          label="Currency"
          value={summary.currency}
          onChange={(event) => setSummary((prev) => ({ ...prev, currency: event.target.value }))}
        />
        <Input
          label="Total direct"
          type="number"
          value={summary.totalDirect}
          onChange={(event) => setSummary((prev) => ({ ...prev, totalDirect: event.target.value }))}
        />
        <Input
          label="Total indirect"
          type="number"
          value={summary.totalIndirect}
          onChange={(event) => setSummary((prev) => ({ ...prev, totalIndirect: event.target.value }))}
        />
        <div className="budget-totals">
          <span>Lines total</span>
          <strong>
            {budget?.currency ?? 'USD'} {totalLines.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
      <div className="panel-table">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Person</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {(budget?.lines ?? []).map((line) => (
              <tr key={line.id}>
                <td>{line.category}</td>
                <td>
                  {(budget?.currency ?? 'USD')}{' '}
                  {line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td>{line.person?.name ?? '—'}</td>
                <td>{line.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title="Add budget line"
        open={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="budget-line-form" disabled={isProcessing}>
              Save line
            </Button>
          </div>
        }
      >
        <form id="budget-line-form" className="stack" onSubmit={handleAddLine}>
          <Input
            label="Category"
            value={line.category}
            onChange={(event) => setLine((prev) => ({ ...prev, category: event.target.value }))}
            required
          />
          <Input
            label="Amount"
            type="number"
            value={line.amount}
            onChange={(event) => setLine((prev) => ({ ...prev, amount: event.target.value }))}
            required
          />
          <Select
            label="Person"
            value={line.personId}
            onChange={(event) => setLine((prev) => ({ ...prev, personId: event.target.value }))}
          >
            <option value="">N/A</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          <Input
            label="Note"
            value={line.note}
            onChange={(event) => setLine((prev) => ({ ...prev, note: event.target.value }))}
          />
        </form>
      </Modal>
    </section>
  );
};

interface TasksPanelProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, status: Task['status']) => void;
  isProcessing: boolean;
}

const TasksPanel = ({ tasks, onUpdateStatus, isProcessing }: TasksPanelProps) => {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Task list</h2>
      </header>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <div>
              <strong>{task.title}</strong>
              {task.description && <p>{task.description}</p>}
              {task.dueAt && <span className="task-due">Due {new Date(task.dueAt).toLocaleDateString()}</span>}
            </div>
            <select
              value={task.status}
              disabled={isProcessing}
              onChange={(event) => onUpdateStatus(task.id, event.target.value as Task['status'])}
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
};

interface IrbPanelProps {
  studyId: string;
  submission: StudyDetail['irbSubmission'] | null;
  allowedTransitions: IRBStatus[];
  onTransition: (payload: Parameters<typeof transitionIRBStatus>[0]) => void;
  onPathChange: (path: IRBPath) => void;
  isProcessing: boolean;
}

const IRBPanel = ({ studyId, submission, allowedTransitions, onTransition, onPathChange, isProcessing }: IrbPanelProps) => {
  const [targetStatus, setTargetStatus] = useState<IRBStatus | ''>('');
  const [note, setNote] = useState('');
  const [expeditedCategory, setExpeditedCategory] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [determinedAt, setDeterminedAt] = useState('');

  const currentStatus = submission?.currentStatus ?? 'DRAFT';

  const handleTransition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetStatus) return;
    onTransition({
      studyId,
      targetStatus,
      note: note || undefined,
      expeditedCategory: expeditedCategory || undefined,
      meetingDate: meetingDate || undefined,
      determinedAt: determinedAt || undefined,
    });
    setTargetStatus('');
    setNote('');
    setExpeditedCategory('');
    setMeetingDate('');
    setDeterminedAt('');
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>IRB status</h2>
      </header>
      <div className="irb-overview">
        <div>
          <span className="label">Current status</span>
          <StatusPill label={irbStatusLabels[currentStatus]} tone="info" />
        </div>
        <div>
          <span className="label">Review path</span>
          <select
            value={submission?.path ?? 'UNSET'}
            onChange={(event) => onPathChange(event.target.value as IRBPath)}
            disabled={isProcessing}
          >
            <option value="UNSET">Unset</option>
            <option value="EXEMPT">Exempt</option>
            <option value="EXPEDITED">Expedited</option>
            <option value="CONVENED">Convened</option>
          </select>
        </div>
      </div>
      <form className="irb-form" onSubmit={handleTransition}>
        <Select
          label="Next action"
          value={targetStatus}
          onChange={(event) => setTargetStatus(event.target.value as IRBStatus)}
        >
          <option value="">Select status…</option>
          {allowedTransitions.map((status) => (
            <option key={status} value={status}>
              {irbStatusLabels[status]}
            </option>
          ))}
        </Select>
        {targetStatus === 'EXPEDITED_APPROVED' && (
          <Input
            label="Expedited category"
            value={expeditedCategory}
            onChange={(event) => setExpeditedCategory(event.target.value)}
            placeholder="e.g., Category 5"
          />
        )}
        {targetStatus === 'MEETING_SCHEDULED' && (
          <Input
            label="Meeting date"
            type="date"
            value={meetingDate}
            onChange={(event) => setMeetingDate(event.target.value)}
          />
        )}
        {(targetStatus === 'APPROVED' || targetStatus === 'EXPEDITED_APPROVED' || targetStatus === 'EXEMPT_DETERMINATION') && (
          <Input
            label="Determination date"
            type="date"
            value={determinedAt}
            onChange={(event) => setDeterminedAt(event.target.value)}
          />
        )}
        <label className="input-field">
          <span className="input-label">Note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        <div className="modal-actions">
          <Button type="submit" disabled={!targetStatus || isProcessing}>
            Update status
          </Button>
        </div>
      </form>

      <div className="irb-timeline">
        <h3>History</h3>
        <ol>
          {(submission?.statusHistory ?? []).map((entry) => (
            <li key={entry.id}>
              <div className="timeline-row">
                <strong>{irbStatusLabels[entry.toStatus]}</strong>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              {entry.note && <p>{entry.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
