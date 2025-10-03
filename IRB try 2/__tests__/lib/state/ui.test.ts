import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/lib/state/ui';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.setState({ modals: {}, filters: {}, loading: {} });
  });

  describe('Modal Management', () => {
    it('should initialize with empty modals', () => {
      const state = useUIStore.getState();
      expect(state.modals).toEqual({});
    });

    it('should open a modal', () => {
      useUIStore.getState().openModal('test-modal');
      const state = useUIStore.getState();
      expect(state.modals['test-modal']).toBe(true);
    });

    it('should close a modal', () => {
      useUIStore.getState().openModal('test-modal');
      expect(useUIStore.getState().modals['test-modal']).toBe(true);

      useUIStore.getState().closeModal('test-modal');
      expect(useUIStore.getState().modals['test-modal']).toBe(false);
    });

    it('should toggle a modal', () => {
      useUIStore.getState().toggleModal('test-modal');
      expect(useUIStore.getState().modals['test-modal']).toBe(true);

      useUIStore.getState().toggleModal('test-modal');
      expect(useUIStore.getState().modals['test-modal']).toBe(false);

      useUIStore.getState().toggleModal('test-modal');
      expect(useUIStore.getState().modals['test-modal']).toBe(true);
    });

    it('should manage multiple modals independently', () => {
      useUIStore.getState().openModal('modal-1');
      useUIStore.getState().openModal('modal-2');

      const state = useUIStore.getState();
      expect(state.modals['modal-1']).toBe(true);
      expect(state.modals['modal-2']).toBe(true);

      useUIStore.getState().closeModal('modal-1');
      const updatedState = useUIStore.getState();
      expect(updatedState.modals['modal-1']).toBe(false);
      expect(updatedState.modals['modal-2']).toBe(true);
    });
  });

  describe('Filter Management', () => {
    it('should initialize with empty filters', () => {
      const state = useUIStore.getState();
      expect(state.filters).toEqual({});
    });

    it('should set a filter', () => {
      useUIStore.getState().setFilter('status', 'active');
      const state = useUIStore.getState();
      expect(state.filters.status).toBe('active');
    });

    it('should set multiple filters', () => {
      useUIStore.getState().setFilter('status', 'active');
      useUIStore.getState().setFilter('category', 'research');
      useUIStore.getState().setFilter('year', 2024);

      const state = useUIStore.getState();
      expect(state.filters).toEqual({
        status: 'active',
        category: 'research',
        year: 2024,
      });
    });

    it('should overwrite existing filter', () => {
      useUIStore.getState().setFilter('status', 'active');
      expect(useUIStore.getState().filters.status).toBe('active');

      useUIStore.getState().setFilter('status', 'completed');
      expect(useUIStore.getState().filters.status).toBe('completed');
    });

    it('should clear all filters', () => {
      useUIStore.getState().setFilter('status', 'active');
      useUIStore.getState().setFilter('category', 'research');
      expect(Object.keys(useUIStore.getState().filters).length).toBe(2);

      useUIStore.getState().clearFilters();
      expect(useUIStore.getState().filters).toEqual({});
    });

    it('should handle complex filter values', () => {
      const complexFilter = {
        min: 0,
        max: 100,
        tags: ['tag1', 'tag2'],
      };

      useUIStore.getState().setFilter('range', complexFilter);
      expect(useUIStore.getState().filters.range).toEqual(complexFilter);
    });
  });

  describe('Loading State Management', () => {
    it('should initialize with empty loading state', () => {
      const state = useUIStore.getState();
      expect(state.loading).toEqual({});
    });

    it('should set loading state to true', () => {
      useUIStore.getState().setLoading('fetch-studies', true);
      expect(useUIStore.getState().loading['fetch-studies']).toBe(true);
    });

    it('should set loading state to false', () => {
      useUIStore.getState().setLoading('fetch-studies', true);
      expect(useUIStore.getState().loading['fetch-studies']).toBe(true);

      useUIStore.getState().setLoading('fetch-studies', false);
      expect(useUIStore.getState().loading['fetch-studies']).toBe(false);
    });

    it('should manage multiple loading states independently', () => {
      useUIStore.getState().setLoading('fetch-studies', true);
      useUIStore.getState().setLoading('fetch-participants', true);
      useUIStore.getState().setLoading('fetch-documents', false);

      const state = useUIStore.getState();
      expect(state.loading['fetch-studies']).toBe(true);
      expect(state.loading['fetch-participants']).toBe(true);
      expect(state.loading['fetch-documents']).toBe(false);
    });

    it('should toggle loading state', () => {
      useUIStore.getState().setLoading('api-call', true);
      expect(useUIStore.getState().loading['api-call']).toBe(true);

      useUIStore.getState().setLoading('api-call', false);
      expect(useUIStore.getState().loading['api-call']).toBe(false);

      useUIStore.getState().setLoading('api-call', true);
      expect(useUIStore.getState().loading['api-call']).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle all state types simultaneously', () => {
      useUIStore.getState().openModal('create-study');
      useUIStore.getState().setFilter('status', 'pending');
      useUIStore.getState().setLoading('submit', true);

      const state = useUIStore.getState();
      expect(state.modals['create-study']).toBe(true);
      expect(state.filters.status).toBe('pending');
      expect(state.loading.submit).toBe(true);
    });

    it('should maintain state isolation between different keys', () => {
      useUIStore.getState().openModal('modal-1');
      useUIStore.getState().setFilter('filter-1', 'value-1');
      useUIStore.getState().setLoading('loading-1', true);

      useUIStore.getState().closeModal('modal-1');

      const state = useUIStore.getState();
      expect(state.modals['modal-1']).toBe(false);
      expect(state.filters['filter-1']).toBe('value-1');
      expect(state.loading['loading-1']).toBe(true);
    });

    it('should handle rapid state updates', () => {
      for (let i = 0; i < 10; i++) {
        useUIStore.getState().setLoading(`operation-${i}`, i % 2 === 0);
      }

      const state = useUIStore.getState();
      expect(state.loading['operation-0']).toBe(true);
      expect(state.loading['operation-1']).toBe(false);
      expect(state.loading['operation-9']).toBe(false);
      expect(Object.keys(state.loading).length).toBe(10);
    });
  });
});
