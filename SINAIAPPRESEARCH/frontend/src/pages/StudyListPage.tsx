import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { StatusPill } from '../components/StatusPill';
import { SummaryCard, SummaryGrid } from '../components/SummaryStats';
import {
  createStudy,
  fetchPeople,
  fetchStudies,
  fetchStudyTypes,
  type CreateStudyPayload,
  type ListStudiesParams,
} from '../api/studies';
import type { StudyListItem, StudyType, Person } from '../types/api';
import './StudyListPage.css';

const riskOptions: Array<{ label: string; value: CreateStudyPayload['riskLevel'] }> = [
  { label: 'Minimal risk', value: 'MINIMAL' },
  { label: 'More than minimal', value: 'MORE_THAN_MINIMAL' },
];

const statusTone = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUBMITTED_TO_IRB':
    case 'READY_TO_SUBMIT':
      return 'info';
    case 'CLOSED':
      return 'neutral';
    default:
      return 'warning';
  }
};

export const StudyListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ListStudiesParams>({});
  const [showCreate, setShowCreate] = useState(false);

  const { data: studies, isLoading } = useQuery({
    queryKey: ['studies', filters],
    queryFn: () => fetchStudies(filters),
  });
  const stats = useMemo(() => {
    const items = studies ?? [];
    const total = items.length;
    const active = items.filter((study) => study.status === 'ACTIVE').length;
    const submitted = items.filter((study) => study.status === 'SUBMITTED_TO_IRB').length;
    const minimalRisk = items.filter((study) => study.riskLevel === 'MINIMAL').length;
    return { total, active, submitted, minimalRisk };
  }, [studies]);


  const { data: studyTypes } = useQuery({ queryKey: ['study-types'], queryFn: fetchStudyTypes });
  const { data: people } = useQuery({ queryKey: ['people'], queryFn: fetchPeople });

  const createMutation = useMutation({
    mutationFn: createStudy,
    onSuccess: (study) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      setShowCreate(false);
      navigate(`/studies/${study.id}`);
    },
  });

  const handleFilterChange = (key: keyof ListStudiesParams, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const filteredPis = useMemo(() => {
    if (!people) return [];
    return people.filter((person) => person.roles.includes('pi'));
  }, [people]);

  return (
    <section className="study-list">
      <header className="study-list__header">
        <div>
          <h1>Active studies</h1>
          <p>Track where each protocol sits in the pipeline and jump straight into the workspace.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!studyTypes?.length || !filteredPis.length}>
          New Study
        </Button>
      </header>

      <div className="study-filters">
        <Input
          label="Search"
          placeholder="Title, sponsor, short name"
          value={filters.search ?? ''}
          onChange={(event) => handleFilterChange('search', event.target.value)}
        />
        <Select
          label="PI"
          value={filters.piId ?? ''}
          onChange={(event) => handleFilterChange('piId', event.target.value)}
        >
          <option value="">All</option>
          {filteredPis.map((pi) => (
            <option key={pi.id} value={pi.id}>
              {pi.name}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={filters.status ?? ''}
          onChange={(event) => handleFilterChange('status', event.target.value)}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="READY_TO_SUBMIT">Ready to submit</option>
          <option value="SUBMITTED_TO_IRB">Submitted to IRB</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </div>

      {Boolean(studies?.length) && (
        <SummaryGrid>
          <SummaryCard label="Total studies" value={stats.total.toString()} />
          <SummaryCard label="Active" value={stats.active.toString()} tone="success" />
          <SummaryCard label="Submitted" value={stats.submitted.toString()} tone="info" />
          <SummaryCard label="Minimal risk" value={stats.minimalRisk.toString()} tone="warning">
            {(stats.minimalRisk / Math.max(stats.total, 1) * 100).toFixed(0)}% of portfolio
          </SummaryCard>
        </SummaryGrid>
      )}

      {isLoading ? (
        <div className="empty-state">Loading studies…</div>
      ) : !studies?.length ? (
        <div className="empty-state">
          <p>No studies yet. Use the “New Study” button to add your first protocol.</p>
        </div>
      ) : (
        <div className="study-grid">
          {studies.map((study) => (
            <StudyCard key={study.id} study={study} onOpen={() => navigate(`/studies/${study.id}`)} />
          ))}
        </div>
      )}

      <CreateStudyModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
        studyTypes={studyTypes ?? []}
        principalInvestigators={filteredPis}
      />
    </section>
  );
};

const StudyCard = ({ study, onOpen }: { study: StudyListItem; onOpen: () => void }) => {
  return (
    <article className="study-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="study-card__header">
        <h2>{study.title}</h2>
        <StatusPill label={study.status.replace(/_/g, ' ')} tone={statusTone(study.status)} />
      </div>
      <dl>
        <div>
          <dt>Study type</dt>
          <dd>{study.type.name}</dd>
        </div>
        <div>
          <dt>Principal Investigator</dt>
          <dd>{study.principalInvestigator.name}</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{study.riskLevel === 'MINIMAL' ? 'Minimal' : 'More than minimal'}</dd>
        </div>
        <div>
          <dt>Sponsor</dt>
          <dd>{study.sponsorName ?? '—'}</dd>
        </div>
      </dl>
      <footer>
        <span>Last updated {new Date(study.updatedAt).toLocaleString()}</span>
        <span>{study.isMultiSite ? 'Multisite' : 'Single site'}</span>
      </footer>
    </article>
  );
};

interface CreateStudyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStudyPayload) => void;
  isSubmitting: boolean;
  studyTypes: StudyType[];
  principalInvestigators: Person[];
}

const CreateStudyModal = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  studyTypes,
  principalInvestigators,
}: CreateStudyModalProps) => {
  const ready = studyTypes.length > 0 && principalInvestigators.length > 0;
  const defaultPi = principalInvestigators[0]?.id ?? '';
  const defaultType = studyTypes[0]?.id ?? '';

  const [form, setForm] = useState<CreateStudyPayload>({
    title: '',
    shortTitle: '',
    sponsorName: '',
    piId: defaultPi,
    typeId: defaultType,
    riskLevel: 'MORE_THAN_MINIMAL',
    sites: [
      {
        name: 'Main campus',
        isInternal: true,
      },
    ],
  });

  useEffect(() => {
    if (!open) return;
    const fallbackPi = principalInvestigators[0]?.id ?? '';
    const fallbackType = studyTypes[0]?.id ?? '';
    setForm((prev) => ({
      ...prev,
      piId: prev.piId || fallbackPi,
      typeId: prev.typeId || fallbackType,
    }));
  }, [open, principalInvestigators, studyTypes]);

  const resetForm = () => {
    setForm({
      title: '',
      shortTitle: '',
      sponsorName: '',
      piId: defaultPi,
      typeId: defaultType,
      riskLevel: 'MORE_THAN_MINIMAL',
      sites: [
        {
          name: 'Main campus',
          isInternal: true,
        },
      ],
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || !form.title || !form.typeId || !form.piId) return;
    onSubmit({
      title: form.title,
      shortTitle: form.shortTitle?.trim() || undefined,
      sponsorName: form.sponsorName?.trim() || undefined,
      typeId: form.typeId,
      piId: form.piId,
      riskLevel: form.riskLevel,
      sites: form.sites,
    });
  };

  return (
    <Modal
      title="New study"
      open={open}
      onClose={handleClose}
      footer={
        <div className="modal-actions">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-study-form" disabled={isSubmitting || !ready}>
            {isSubmitting ? 'Creating…' : 'Create study'}
          </Button>
        </div>
      }
    >
      <form id="create-study-form" className="create-study-form" onSubmit={handleSubmit}>
        {!ready && <p className="form-hint">Study types and PI roster are still loading. Configure metadata before creating a study.</p>}
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <Input
          label="Short title"
          value={form.shortTitle ?? ''}
          onChange={(event) => setForm((prev) => ({ ...prev, shortTitle: event.target.value }))}
        />
        <Input
          label="Sponsor"
          value={form.sponsorName ?? ''}
          onChange={(event) => setForm((prev) => ({ ...prev, sponsorName: event.target.value }))}
        />
        <Select
          label="Study type"
          value={form.typeId}
          onChange={(event) => setForm((prev) => ({ ...prev, typeId: event.target.value }))}
        >
          {studyTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
        <Select
          label="Risk level"
          value={form.riskLevel}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, riskLevel: event.target.value as CreateStudyPayload['riskLevel'] }))
          }
        >
          {riskOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="Principal Investigator"
          value={form.piId}
          onChange={(event) => setForm((prev) => ({ ...prev, piId: event.target.value }))}
        >
          {principalInvestigators.map((pi) => (
            <option key={pi.id} value={pi.id}>
              {pi.name}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
};
