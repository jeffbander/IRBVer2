import { describe, it, expect, beforeEach } from 'vitest';
import { useStudiesStore, type Study } from '@/lib/state/studies';

describe('Studies Store', () => {
  const mockStudy: Study = {
    id: 'study-1',
    title: 'Test Study',
    protocolNumber: 'PROTO-001',
    status: 'DRAFT',
    type: 'OBSERVATIONAL',
    description: 'A test study',
    riskLevel: 'MINIMAL',
    currentEnrollment: 0,
  };

  beforeEach(() => {
    // Reset store before each test
    useStudiesStore.setState({ studies: [], currentStudy: null });
  });

  it('should initialize with empty studies and null currentStudy', () => {
    const state = useStudiesStore.getState();
    expect(state.studies).toEqual([]);
    expect(state.currentStudy).toBeNull();
  });

  it('should set studies', () => {
    const studies = [mockStudy];
    useStudiesStore.getState().setStudies(studies);

    const state = useStudiesStore.getState();
    expect(state.studies).toEqual(studies);
    expect(state.studies).toHaveLength(1);
  });

  it('should set current study', () => {
    useStudiesStore.getState().setCurrentStudy(mockStudy);

    const state = useStudiesStore.getState();
    expect(state.currentStudy).toEqual(mockStudy);
  });

  it('should add a study', () => {
    useStudiesStore.getState().addStudy(mockStudy);

    const state = useStudiesStore.getState();
    expect(state.studies).toHaveLength(1);
    expect(state.studies[0]).toEqual(mockStudy);
  });

  it('should update a study', () => {
    useStudiesStore.getState().setStudies([mockStudy]);

    const updates = { title: 'Updated Study' };
    useStudiesStore.getState().updateStudy('study-1', updates);

    const state = useStudiesStore.getState();
    expect(state.studies[0].title).toBe('Updated Study');
    expect(state.studies[0].protocolNumber).toBe('PROTO-001'); // Other fields unchanged
  });

  it('should update current study if it matches', () => {
    useStudiesStore.getState().setStudies([mockStudy]);
    useStudiesStore.getState().setCurrentStudy(mockStudy);

    const updates = { status: 'ACTIVE' };
    useStudiesStore.getState().updateStudy('study-1', updates);

    const state = useStudiesStore.getState();
    expect(state.currentStudy?.status).toBe('ACTIVE');
  });

  it('should remove a study', () => {
    const study2: Study = {
      ...mockStudy,
      id: 'study-2',
      title: 'Study 2',
    };

    useStudiesStore.getState().setStudies([mockStudy, study2]);
    expect(useStudiesStore.getState().studies).toHaveLength(2);

    useStudiesStore.getState().removeStudy('study-1');

    const state = useStudiesStore.getState();
    expect(state.studies).toHaveLength(1);
    expect(state.studies[0].id).toBe('study-2');
  });

  it('should clear currentStudy when removing it', () => {
    useStudiesStore.getState().setStudies([mockStudy]);
    useStudiesStore.getState().setCurrentStudy(mockStudy);

    useStudiesStore.getState().removeStudy('study-1');

    const state = useStudiesStore.getState();
    expect(state.currentStudy).toBeNull();
  });

  it('should clear all studies', () => {
    useStudiesStore.getState().setStudies([mockStudy]);
    useStudiesStore.getState().setCurrentStudy(mockStudy);

    useStudiesStore.getState().clearStudies();

    const state = useStudiesStore.getState();
    expect(state.studies).toEqual([]);
    expect(state.currentStudy).toBeNull();
  });
});
