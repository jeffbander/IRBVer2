import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetStuckOcr() {
  console.log('Resetting stuck OCR documents...');

  // Find documents stuck in "processing" state
  const stuckDocs = await prisma.document.findMany({
    where: {
      ocrStatus: 'processing'
    }
  });

  console.log(`Found ${stuckDocs.length} documents stuck in processing state`);

  if (stuckDocs.length > 0) {
    // Reset them to "failed" so they can be retried
    const result = await prisma.document.updateMany({
      where: {
        ocrStatus: 'processing'
      },
      data: {
        ocrStatus: 'failed',
        ocrError: 'OCR processing timed out or crashed. Server was restarted. Please retry OCR.'
      }
    });

    console.log(`✅ Reset ${result.count} documents to failed state`);
    console.log('Users can now retry OCR on these documents');
  } else {
    console.log('✅ No stuck documents found');
  }
}

resetStuckOcr()
  .catch((e) => {
    console.error('Error resetting stuck OCR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
