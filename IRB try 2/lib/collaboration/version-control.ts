import { prisma } from '@/lib/prisma';

export interface VersionChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

export interface CreateVersionOptions {
  studyId: string;
  changes: VersionChange[];
  changedBy: string;
  changeType: 'major' | 'minor' | 'patch';
  changeNotes?: string;
}

/**
 * Create a new protocol version
 */
export async function createProtocolVersion(
  options: CreateVersionOptions
): Promise<{ id: string; versionNumber: number }> {
  const { studyId, changes, changedBy, changeType, changeNotes } = options;

  // Get the latest version number
  const latestVersion = await prisma.protocolVersion.findFirst({
    where: { studyId },
    orderBy: { versionNumber: 'desc' },
  });

  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  // Create new version record
  const version = await prisma.protocolVersion.create({
    data: {
      studyId,
      versionNumber: newVersionNumber,
      changes: JSON.stringify(changes),
      changedBy,
      changeType,
      changeNotes,
      previousVersion: latestVersion?.id,
    },
  });

  return {
    id: version.id,
    versionNumber: version.versionNumber,
  };
}

/**
 * Get version history for a study
 */
export async function getVersionHistory(studyId: string) {
  const versions = await prisma.protocolVersion.findMany({
    where: { studyId },
    orderBy: { versionNumber: 'desc' },
  });

  return versions.map((v) => ({
    ...v,
    changes: JSON.parse(v.changes),
  }));
}

/**
 * Compare two protocol versions
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<{
  version1: any;
  version2: any;
  differences: VersionChange[];
}> {
  const [v1, v2] = await Promise.all([
    prisma.protocolVersion.findUnique({ where: { id: versionId1 } }),
    prisma.protocolVersion.findUnique({ where: { id: versionId2 } }),
  ]);

  if (!v1 || !v2) {
    throw new Error('Version not found');
  }

  const changes1 = JSON.parse(v1.changes);
  const changes2 = JSON.parse(v2.changes);

  // Calculate differences
  const differences = calculateDifferences(changes1, changes2);

  return {
    version1: { ...v1, changes: changes1 },
    version2: { ...v2, changes: changes2 },
    differences,
  };
}

/**
 * Calculate differences between two change sets
 */
function calculateDifferences(
  changes1: VersionChange[],
  changes2: VersionChange[]
): VersionChange[] {
  const fieldMap = new Map<string, { change1?: VersionChange; change2?: VersionChange }>();

  changes1.forEach((change) => {
    fieldMap.set(change.field, { change1: change });
  });

  changes2.forEach((change) => {
    const existing = fieldMap.get(change.field);
    if (existing) {
      existing.change2 = change;
    } else {
      fieldMap.set(change.field, { change2: change });
    }
  });

  const differences: VersionChange[] = [];

  fieldMap.forEach((value, field) => {
    if (value.change1 && !value.change2) {
      differences.push(value.change1);
    } else if (!value.change1 && value.change2) {
      differences.push(value.change2);
    } else if (value.change1 && value.change2) {
      if (
        JSON.stringify(value.change1.newValue) !== JSON.stringify(value.change2.newValue)
      ) {
        differences.push({
          field,
          oldValue: value.change1.newValue,
          newValue: value.change2.newValue,
          changeType: 'modified',
        });
      }
    }
  });

  return differences;
}

/**
 * Rollback to a previous version
 */
export async function rollbackToVersion(
  studyId: string,
  targetVersionId: string,
  rolledBackBy: string
): Promise<void> {
  const targetVersion = await prisma.protocolVersion.findUnique({
    where: { id: targetVersionId },
  });

  if (!targetVersion || targetVersion.studyId !== studyId) {
    throw new Error('Version not found or does not belong to this study');
  }

  const changes = JSON.parse(targetVersion.changes);

  // Create a new version representing the rollback
  await createProtocolVersion({
    studyId,
    changes: changes.map((c: VersionChange) => ({
      ...c,
      oldValue: c.newValue,
      newValue: c.oldValue,
    })),
    changedBy: rolledBackBy,
    changeType: 'major',
    changeNotes: `Rolled back to version ${targetVersion.versionNumber}`,
  });
}
