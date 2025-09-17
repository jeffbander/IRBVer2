import { Router } from 'express';
import { Pool } from 'pg';
import { FormController } from '../controllers/FormController';
import { VisitController } from '../controllers/VisitController';
import { ResponseController } from '../controllers/ResponseController';
import { QueryController } from '../controllers/QueryController';
import { ExportController } from '../controllers/ExportController';

export function createRoutes(db: Pool): Router {
  const router = Router();

  // Initialize controllers
  const formController = new FormController(db);
  const visitController = new VisitController(db);
  const responseController = new ResponseController(db);
  const queryController = new QueryController(db);
  const exportController = new ExportController(db);

  // Form routes
  router.post('/forms', formController.createForm);
  router.get('/forms/:id', formController.getForm);
  router.put('/forms/:id', formController.updateForm);
  router.delete('/forms/:id', formController.deleteForm);
  router.post('/forms/:id/versions', formController.createFormVersion);
  router.post('/forms/:id/publish', formController.publishForm);
  router.post('/forms/:id/archive', formController.archiveForm);
  router.post('/forms/:id/validate', formController.validateFormData);
  router.get('/studies/:studyId/forms', formController.getStudyForms);
  router.get('/studies/:studyId/forms/:name/versions', formController.getFormVersions);

  // Visit Definition routes
  router.post('/visit-definitions', visitController.createVisitDefinition);
  router.get('/visit-definitions/:id', visitController.getVisitDefinition);
  router.put('/visit-definitions/:id', visitController.updateVisitDefinition);
  router.get('/studies/:studyId/visit-definitions', visitController.getStudyVisitDefinitions);

  // Visit routes
  router.post('/visits', visitController.scheduleVisit);
  router.get('/visits/:id', visitController.getVisit);
  router.put('/visits/:id', visitController.updateVisit);
  router.delete('/visits/:id', visitController.deleteVisit);
  router.put('/visits/:id/procedures', visitController.updateVisitProcedures);
  router.get('/visits/:id/deviations', visitController.checkVisitDeviations);
  router.get('/participants/:participantId/visits', visitController.getParticipantVisits);
  router.get('/studies/:studyId/visits', visitController.getStudyVisits);

  // Form Response routes
  router.post('/responses', responseController.createResponse);
  router.get('/responses/:id', responseController.getResponse);
  router.put('/responses/:id', responseController.updateResponse);
  router.delete('/responses/:id', responseController.deleteResponse);
  router.post('/responses/:id/signatures', responseController.addSignature);
  router.post('/responses/:id/validate', responseController.validateResponse);
  router.post('/responses/:id/lock', responseController.lockResponse);
  router.post('/responses/:id/unlock', responseController.unlockResponse);
  router.get('/responses/:id/audit', responseController.getAuditTrail);
  router.get('/participants/:participantId/responses', responseController.getParticipantResponses);

  // Query routes
  router.post('/queries', queryController.createQuery);
  router.get('/queries/:id', queryController.getQuery);
  router.put('/queries/:id', queryController.updateQuery);
  router.delete('/queries/:id', queryController.deleteQuery);
  router.post('/queries/:id/responses', queryController.respondToQuery);
  router.post('/queries/:id/resolve', queryController.resolveQuery);
  router.post('/queries/:id/reopen', queryController.reopenQuery);
  router.post('/queries/:id/assign', queryController.assignQuery);
  router.post('/queries/:id/escalate', queryController.escalateQuery);
  router.get('/queries/assigned', queryController.getAssignedQueries);
  router.get('/queries/statistics', queryController.getQueryStatistics);
  router.get('/studies/:studyId/queries', queryController.getStudyQueries);
  router.get('/participants/:participantId/queries', queryController.getParticipantQueries);

  // Export routes
  router.post('/exports', exportController.createExport);
  router.get('/exports/:id', exportController.getExport);
  router.get('/exports/:id/download', exportController.downloadExport);
  router.post('/exports/:id/cancel', exportController.cancelExport);
  router.delete('/exports/:id', exportController.deleteExport);
  router.get('/studies/:studyId/exports', exportController.getStudyExports);

  return router;
}