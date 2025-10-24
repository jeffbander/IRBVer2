# AI Protocol Analysis Engine & Infrastructure

**Parent Issue:** #10
**Phase:** Phase 1 - Foundation
**Priority:** P0 (Critical Path)
**Estimated Time:** 4-5 days

---

## 📋 Description

Build the core AI protocol analysis engine with OpenAI GPT-4o integration, async job processing with BullMQ, and fallback to Claude 3.5 Sonnet.

---

## 🎯 Acceptance Criteria

- [ ] API endpoint `/api/ai/analyze-protocol` accepts study ID and triggers analysis
- [ ] OpenAI GPT-4o integration working (primary)
- [ ] Claude 3.5 Sonnet fallback implemented (backup)
- [ ] BullMQ job queue processing AI analysis requests
- [ ] Redis connection for job queue
- [ ] Study metadata extraction from OCR content
- [ ] Executive summary generation
- [ ] Complexity scoring (1-10 scale)
- [ ] Compliance scoring (0-100%)
- [ ] Risk level assessment (low/medium/high/critical)
- [ ] Processing time tracking
- [ ] Error handling and retry logic
- [ ] Status updates (pending → processing → completed/failed)
- [ ] Results stored in AiAnalysis model

---

## 🔧 Implementation Files

**New Files:**
- `app/api/ai/analyze-protocol/route.ts` - API endpoint
- `lib/ai/openai-client.ts` - OpenAI service wrapper
- `lib/ai/anthropic-client.ts` - Claude service wrapper
- `lib/ai/protocol-analyzer.ts` - Core analysis logic
- `lib/jobs/ai-analysis-worker.ts` - BullMQ worker
- `lib/jobs/queue.ts` - Job queue configuration

**Environment Variables:**
```env
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379
```

---

## 📝 Tasks

- [ ] Install dependencies: `npm install openai @anthropic-ai/sdk bullmq ioredis`
- [ ] Create OpenAI client wrapper
- [ ] Create Anthropic client wrapper
- [ ] Build protocol analyzer service
- [ ] Set up BullMQ job queue
- [ ] Create AI analysis worker
- [ ] Implement API endpoint
- [ ] Add error handling and retries
- [ ] Test with sample protocol
- [ ] Monitor AI API costs
- [ ] Add logging

---

## 🧪 Testing

- [ ] Unit tests for AI client wrappers
- [ ] Integration tests for analysis pipeline
- [ ] E2E test: Upload protocol → Trigger analysis → Verify results
- [ ] Test fallback from OpenAI to Claude
- [ ] Test error scenarios (invalid protocol, AI timeout, etc.)
- [ ] Load testing (multiple concurrent analyses)

---

## 🔗 Dependencies

**Blocks:**
- #TBD - AI Analysis Dashboard UI

**Depends on:**
- #11 - Database Schema Migration

---

**Created:** 2025-01-23
