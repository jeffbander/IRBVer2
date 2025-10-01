# E2E Tests

Comprehensive end-to-end tests for the Medical AI Outbound Calling System using Playwright.

## Test Suites

### 1. Dashboard UI Tests (`dashboard.spec.js`)
- ✅ Dashboard loading and main elements
- ✅ Glassmorphism effects verification
- ✅ Animation testing
- ✅ Search functionality
- ✅ Modal interactions
- ✅ Gradient backgrounds
- ✅ Hover effects
- ✅ Empty states
- ✅ Responsive design

### 2. Patient Management Tests (`patient-management.spec.js`)
- ✅ Create new patient
- ✅ Form validation
- ✅ View patient details
- ✅ Search patients
- ✅ Edit existing patient
- ✅ Patient statistics
- ✅ Delete patient
- ✅ Call history display

### 3. API Integration Tests (`api-integration.spec.js`)
- ✅ Fetch patients from API
- ✅ Create patient via API
- ✅ Retrieve specific patient
- ✅ Update patient via API
- ✅ Health endpoint check
- ✅ Audit logs retrieval
- ✅ 404 error handling
- ✅ Field validation
- ✅ Root API information

## Running Tests

### All Tests (Headless)
```bash
npm run test:e2e
```

### Headed Mode (Watch Tests Run)
```bash
npm run test:e2e:headed
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode (Step Through)
```bash
npm run test:e2e:debug
```

### Specific Browser
```bash
npm run test:e2e:chromium
```

### View Report
```bash
npm run test:e2e:report
```

## Test Configuration

Tests are configured in `playwright.config.js`:
- **Base URL**: http://localhost:5052
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Headed Mode**: Enabled by default for visibility
- **Slow Mo**: 100ms delay for better observation
- **Screenshots**: On failure
- **Videos**: Retained on failure
- **Traces**: On first retry

## Test Fixtures

Mock data and helpers available in `tests/fixtures/test-data.js`:
- `mockPatients`: Array of test patient data
- `mockCallRecord`: Sample call record
- `createTestPatient()`: Helper to create test patient
- `deleteTestPatient()`: Helper to delete test patient
- `cleanupTestData()`: Helper to remove test data

## Best Practices

1. **Test Isolation**: Each test is independent
2. **Data Cleanup**: Tests clean up after themselves
3. **Wait Strategies**: Proper waiting for network and DOM
4. **Assertions**: Clear and specific expectations
5. **Error Handling**: Graceful handling of missing data
6. **Accessibility**: Tests check for proper elements

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

GitHub Actions workflow: `.github/workflows/e2e-tests.yml`

## Troubleshooting

### Tests Failing?
1. Ensure server is running: `npm start`
2. Check browser installation: `npx playwright install`
3. Verify environment variables in `.env`
4. Check network connectivity

### Slow Tests?
1. Reduce `slowMo` in config
2. Run specific tests instead of all
3. Use headless mode

### Debugging Tips
1. Use `--debug` flag to step through
2. Add `await page.pause()` to stop execution
3. Check screenshots in `test-results/`
4. Review videos for failed tests
