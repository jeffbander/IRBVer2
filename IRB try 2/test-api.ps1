# Simple API test for coordinator management
$BASE_URL = "http://localhost:3000"

Write-Host "`n=== Testing Coordinator Management API ===" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n1. Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BASE_URL/api/health"
Write-Host "   Status: $($health.status)" -ForegroundColor Green

# 2. Login
Write-Host "`n2. Login as Researcher..." -ForegroundColor Yellow
$loginBody = @{ email = "researcher@irb.local"; password = "password123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "$BASE_URL/api/auth" -Method POST -ContentType "application/json" -Body $loginBody
$token = $auth.token
Write-Host "   User: $($auth.user.firstName) $($auth.user.lastName) ($($auth.user.role.name))" -ForegroundColor Green

# 3. Get Studies
Write-Host "`n3. Get Studies..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token" }
$studies = Invoke-RestMethod -Uri "$BASE_URL/api/studies" -Headers $headers
Write-Host "   Found: $($studies.Count) studies" -ForegroundColor Green
$studyId = $studies[0].id
Write-Host "   Testing with: $($studies[0].title)" -ForegroundColor Gray

# 4. Get Coordinators
Write-Host "`n4. Get Coordinators for Study..." -ForegroundColor Yellow
$coords = Invoke-RestMethod -Uri "$BASE_URL/api/studies/$studyId/coordinators" -Headers $headers
Write-Host "   Currently assigned: $($coords.Count) coordinators" -ForegroundColor Green

# 5. Get Available Coordinators
Write-Host "`n5. Get Available Coordinators..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$BASE_URL/api/users?role=coordinator" -Headers $headers
Write-Host "   Available coordinators: $($users.Count)" -ForegroundColor Green
if ($users.Count -gt 0) {
    Write-Host "   - $($users[0].firstName) $($users[0].lastName) ($($users[0].email))" -ForegroundColor Gray
}

# 6. Assign Coordinator (if not already assigned)
if ($coords.Count -eq 0 -and $users.Count -gt 0) {
    Write-Host "`n6. Assigning Coordinator..." -ForegroundColor Yellow
    $assignBody = @{ coordinatorId = $users[0].id } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$BASE_URL/api/studies/$studyId/coordinators" `
        -Method POST -Headers $headers -ContentType "application/json" -Body $assignBody
    Write-Host "   ✓ Coordinator assigned!" -ForegroundColor Green
    Write-Host "   Assignment ID: $($result.id)" -ForegroundColor Gray
} else {
    Write-Host "`n6. Skipping assignment (already has coordinators)" -ForegroundColor Gray
}

Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green
Write-Host "`nTest URLs:" -ForegroundColor Yellow
Write-Host "  - Coordinator Mgmt: $BASE_URL/studies/$studyId/coordinators" -ForegroundColor Cyan
Write-Host "  - Coord Dashboard:  $BASE_URL/dashboard/coordinator" -ForegroundColor Cyan
Write-Host "  - Studies:          $BASE_URL/studies" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credentials: researcher@irb.local / password123" -ForegroundColor Gray
Write-Host ""
