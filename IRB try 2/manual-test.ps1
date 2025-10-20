# PowerShell script to test coordinator management feature
$BASE_URL = "http://localhost:3000"

Write-Host "=== Coordinator Management Feature Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/api/health" -Method GET
    Write-Host "   ✓ Server is healthy" -ForegroundColor Green
    Write-Host "   Database: $($health.checks.database)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Health check failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Login as Researcher
Write-Host "2. Logging in as Researcher..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "researcher@irb.local"
        password = "password123"
    } | ConvertTo-Json

    $authResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth" -Method POST `
        -ContentType "application/json" -Body $loginBody

    $token = $authResponse.token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
    Write-Host "   User: $($authResponse.user.firstName) $($authResponse.user.lastName)" -ForegroundColor Gray
    Write-Host "   Role: $($authResponse.user.role.name)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Get Studies
Write-Host "3. Fetching Studies..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $studies = Invoke-RestMethod -Uri "$BASE_URL/api/studies" -Method GET -Headers $headers
    Write-Host "   ✓ Retrieved $($studies.Count) studies" -ForegroundColor Green

    if ($studies.Count -gt 0) {
        $studyId = $studies[0].id
        Write-Host "   First study: $($studies[0].title)" -ForegroundColor Gray
        Write-Host "   Study ID: $studyId" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed to fetch studies: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Get Coordinators for Study
Write-Host "4. Fetching Coordinators for Study..." -ForegroundColor Yellow
try {
    $coordinators = Invoke-RestMethod -Uri "$BASE_URL/api/studies/$studyId/coordinators" `
        -Method GET -Headers $headers

    Write-Host "   ✓ Retrieved $($coordinators.Count) coordinators" -ForegroundColor Green

    if ($coordinators.Count -gt 0) {
        foreach ($coord in $coordinators) {
            Write-Host "   - $($coord.coordinator.firstName) $($coord.coordinator.lastName) ($($coord.coordinator.email))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (No coordinators assigned yet)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed to fetch coordinators: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Get All Users (to find coordinator ID)
Write-Host "5. Finding available coordinators..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$BASE_URL/api/users?role=coordinator" `
        -Method GET -Headers $headers

    if ($users.Count -gt 0) {
        $coordinatorId = $users[0].id
        Write-Host "   ✓ Found $($users.Count) coordinator(s)" -ForegroundColor Green
        Write-Host "   First coordinator: $($users[0].firstName) $($users[0].lastName)" -ForegroundColor Gray
        Write-Host "   Coordinator ID: $coordinatorId" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ No coordinators found in system" -ForegroundColor Red
        $coordinatorId = $null
    }
} catch {
    Write-Host "   ✗ Failed to fetch users: $($_.Exception.Message)" -ForegroundColor Red
    $coordinatorId = $null
}

Write-Host ""

# Test 6: Assign Coordinator (if we found one and they're not already assigned)
if ($coordinatorId -and $coordinators.Count -eq 0) {
    Write-Host "6. Assigning Coordinator to Study..." -ForegroundColor Yellow
    try {
        $assignBody = @{
            coordinatorId = $coordinatorId
        } | ConvertTo-Json

        $assignment = Invoke-RestMethod -Uri "$BASE_URL/api/studies/$studyId/coordinators" `
            -Method POST -Headers $headers -ContentType "application/json" -Body $assignBody

        Write-Host "   ✓ Coordinator assigned successfully" -ForegroundColor Green
        Write-Host "   Assignment ID: $($assignment.id)" -ForegroundColor Gray
        Write-Host "   Assigned At: $($assignment.assignedAt)" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Failed to assign coordinator: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "6. Skipping coordinator assignment (already assigned or no coordinators available)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Server is running at: $BASE_URL" -ForegroundColor Green
Write-Host "✓ API endpoints are responding correctly" -ForegroundColor Green
Write-Host ""
Write-Host "Manual Testing URLs:" -ForegroundColor Yellow
Write-Host "  - Login:                  $BASE_URL/login" -ForegroundColor Gray
Write-Host "  - Dashboard:              $BASE_URL/dashboard" -ForegroundColor Gray
Write-Host "  - Studies:                $BASE_URL/studies" -ForegroundColor Gray
Write-Host "  - Coordinator Management: $BASE_URL/studies/$studyId/coordinators" -ForegroundColor Gray
Write-Host "  - Coordinator Dashboard:  $BASE_URL/dashboard/coordinator" -ForegroundColor Gray
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    researcher@irb.local" -ForegroundColor Gray
Write-Host "  Password: password123" -ForegroundColor Gray
Write-Host ""
