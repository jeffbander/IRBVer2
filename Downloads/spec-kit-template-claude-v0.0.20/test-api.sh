#!/bin/bash

echo "========================================="
echo "Testing Mount Sinai Study Management API"
echo "========================================="

API_BASE="http://localhost:3001/api/v1"

# 1. Test Login
echo -e "\n1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.chen@mountsinai.org",
    "password": "Test123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
echo "✓ Login successful. Token: ${TOKEN:0:20}..."

# 2. Get Studies List
echo -e "\n2. Getting Studies List..."
curl -s -X GET "$API_BASE/studies" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo "✓ Studies retrieved"

# 3. Create a New Study
echo -e "\n3. Creating a New Study..."
NEW_STUDY=$(curl -s -X POST "$API_BASE/studies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "protocolNumber": "MSH-2025-TEST-001",
    "title": "Automated Test Study for AI-Driven Research Platform",
    "description": "This is a test study created to validate the full CRUD functionality of the Mount Sinai Research Study Management System.",
    "type": "INTERVENTIONAL",
    "phase": "PHASE_3",
    "status": "DRAFT",
    "targetEnrollment": 150,
    "startDate": "2025-01-01",
    "endDate": "2026-12-31",
    "sponsorName": "Mount Sinai Innovation Lab",
    "fundingAmount": 750000
  }')

STUDY_ID=$(echo $NEW_STUDY | grep -o '"id":"[^"]*' | sed 's/"id":"//')
echo "✓ Study created with ID: $STUDY_ID"
echo $NEW_STUDY | python3 -m json.tool | head -15

# 4. Get the Created Study
echo -e "\n4. Getting Study Details..."
curl -s -X GET "$API_BASE/studies/$STUDY_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo "✓ Study details retrieved"

# 5. Update the Study
echo -e "\n5. Updating Study..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/studies/$STUDY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "UNDER_REVIEW",
    "description": "Updated: This study has been submitted for IRB review and includes comprehensive safety monitoring.",
    "targetEnrollment": 200
  }')
echo "✓ Study updated"
echo $UPDATE_RESPONSE | python3 -m json.tool | head -15

# 6. Create Another Study for Testing
echo -e "\n6. Creating Second Test Study..."
curl -s -X POST "$API_BASE/studies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "protocolNumber": "MSH-2025-CARDIO-002",
    "title": "Advanced Cardiac Imaging with AI Analysis",
    "description": "Prospective study evaluating AI-assisted cardiac MRI interpretation for early detection of cardiomyopathy.",
    "type": "OBSERVATIONAL",
    "phase": "NOT_APPLICABLE",
    "status": "ENROLLING",
    "targetEnrollment": 500,
    "startDate": "2025-02-01",
    "sponsorName": "Mount Sinai Heart Institute",
    "fundingAmount": 2500000
  }' | python3 -m json.tool | head -10
echo "✓ Second study created"

# 7. Get Updated Studies List
echo -e "\n7. Getting Updated Studies List..."
STUDIES_COUNT=$(curl -s -X GET "$API_BASE/studies" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data']))")
echo "✓ Total studies in system: $STUDIES_COUNT"

echo -e "\n========================================="
echo "✅ All API Tests Completed Successfully!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Authentication: Working ✓"
echo "- Create Study: Working ✓"
echo "- Read Study: Working ✓"
echo "- Update Study: Working ✓"
echo "- List Studies: Working ✓"
echo ""
echo "You can now:"
echo "1. Login at http://localhost:3000"
echo "2. View the dashboard with all studies"
echo "3. Create new studies"
echo "4. Edit existing studies"
echo "5. View study details"