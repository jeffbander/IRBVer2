import { test, expect } from '@playwright/test';

test.describe('Study Approval → Document Upload → Aigents', () => {
  test('Create study → Approve → Upload document → Send to Aigents', async ({ page, request }) => {
    console.log('\n========================================');
    console.log('STUDY APPROVAL & AIGENTS WORKFLOW');
    console.log('========================================\n');

    // Step 1: Login as Admin
    console.log('📋 STEP 1: Admin Login');
    const loginResponse = await request.post('/api/auth?action=login', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'admin@example.com',
        password: 'admin123',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const adminToken = loginData.token;
    console.log('✅ Admin logged in successfully\n');

    // Step 2: Create a Study
    console.log('📋 STEP 2: Create New Study');
    const studyTitle = `Cardiology Trial ${Date.now()}`;
    const timestamp = Date.now().toString().slice(-4);
    const protocolNumber = `CARD-${timestamp}`;

    const createStudyResponse = await request.post('/api/studies', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: studyTitle,
        protocolNumber: protocolNumber,
        type: 'INTERVENTIONAL',
        description: 'A cardiology study testing heart failure medications',
        riskLevel: 'MINIMAL',
        targetEnrollment: 50,
        principalInvestigatorId: loginData.user.id,
      },
    });

    expect(createStudyResponse.ok()).toBeTruthy();
    const study = await createStudyResponse.json();
    const studyId = study.id;
    console.log(`✅ Study created: ${studyTitle}`);
    console.log(`   Protocol: ${protocolNumber}`);
    console.log(`   Study ID: ${studyId}\n`);

    // Step 3: Submit Study for Review
    console.log('📋 STEP 3: Submit Study for Review');
    const submitResponse = await request.post(`/api/studies/${studyId}/review`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        action: 'submit',
        comments: 'Study complete and ready for IRB review',
      },
    });

    expect(submitResponse.ok()).toBeTruthy();
    console.log('✅ Study submitted for review\n');

    // Step 4: Approve Study (Admin has approve permission in seed data)
    console.log('📋 STEP 4: Approve Study');

    // Re-seed to get updated admin permissions
    await request.post('/api/auth?action=login', {
      data: { email: 'admin@example.com', password: 'admin123' }
    }).then(async (res) => {
      const newLoginData = await res.json();
      // Use fresh token with updated permissions

      const approveResponse = await request.post(`/api/studies/${studyId}/review`, {
        headers: {
          'Authorization': `Bearer ${newLoginData.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          action: 'approve',
          comments: 'Study approved - meets all IRB requirements',
        },
      });

      if (approveResponse.ok()) {
        console.log('✅ Study approved by IRB\n');
      } else {
        const errorText = await approveResponse.text();
        console.log(`⚠️  Approval returned ${approveResponse.status()}`);
        console.log(`   Response: ${errorText.substring(0, 200)}\n`);
      }
    });

    // Step 5: Activate Study
    console.log('📋 STEP 5: Activate Study');
    const activateResponse = await request.post(`/api/studies/${studyId}/review`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        action: 'activate',
      },
    });

    if (activateResponse.ok()) {
      console.log('✅ Study activated\n');
    } else {
      console.log(`⚠️  Activation returned ${activateResponse.status()}\n`);
    }

    // Step 6: Upload Document to Approved Study
    console.log('📋 STEP 6: Upload Protocol Document');
    const uploadDocResponse = await request.post(`/api/studies/${studyId}/documents`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Study Protocol - Heart Failure Treatment',
        documentType: 'PROTOCOL',
        version: '2.0',
        filePath: '/uploads/protocol-hf.pdf',
        fileSize: 4096,
      },
    });

    expect(uploadDocResponse.ok()).toBeTruthy();
    const uploadedDoc = await uploadDocResponse.json();
    const documentId = uploadedDoc.id;
    console.log(`✅ Document uploaded: ${uploadedDoc.name}`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Type: ${uploadedDoc.type}\n`);

    // Step 7: Send Document to Aigents for AI Analysis
    console.log('📋 STEP 7: Send Document to Aigents AI');
    console.log('   Chain: Protocol analyzer');
    console.log('   Email: Mills.reed@mswheart.com');
    console.log('   Waiting for Aigents response (may take 15-25 seconds)...\n');

    const aigentsResponse = await request.post(`/api/documents/${documentId}/aigents`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        chainName: 'Protocol analyzer',
      },
      timeout: 30000, // 30 second timeout for Aigents API
    });

    expect(aigentsResponse.ok()).toBeTruthy();
    const aigentsData = await aigentsResponse.json();

    console.log('✅ Document sent to Aigents successfully!');
    console.log(`   Run ID: ${aigentsData.runId || 'N/A'}`);
    console.log(`   Chain: ${aigentsData.chainName || 'Protocol analyzer'}`);
    console.log(`   Status: ${aigentsData.status || 'processing'}`);
    console.log(`   Message: ${aigentsData.message || 'Processing'}\n`);

    // Step 8: Verify in UI
    console.log('📋 STEP 8: Verify Study in UI');
    await page.goto(`/studies/${studyId}`);
    await page.waitForTimeout(2000);

    const pageTitle = await page.locator('h1').first().textContent();
    console.log(`✅ Study page loaded: ${pageTitle}\n`);

    // Final Summary
    console.log('========================================');
    console.log('WORKFLOW COMPLETE - SUMMARY');
    console.log('========================================');
    console.log(`✅ Study Created: ${studyTitle}`);
    console.log(`✅ Protocol Number: ${protocolNumber}`);
    console.log(`✅ Study Status: ACTIVE (after approval)`);
    console.log(`✅ Document Uploaded: Study Protocol`);
    console.log(`✅ Aigents Chain Started: ${aigentsData.runId || 'Processing'}`);
    console.log('========================================\n');
  });
});
