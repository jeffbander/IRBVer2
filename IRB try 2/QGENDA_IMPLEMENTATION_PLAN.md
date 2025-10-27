# QGenda-Inspired Features Implementation Plan
## IRB Management System Enhancement

## Executive Summary

This document outlines the integration of QGenda-inspired healthcare scheduling features into the Mount Sinai IRB Management System. The implementation will transform the current basic visit tracking into a comprehensive, AI-powered scheduling and resource management platform.

---

## 1. Figma MCP Server Setup ✅

### Status
- **COMPLETED**: Figma MCP server added to Claude Code
- **URL**: https://mcp.figma.com/mcp
- **Next Steps**:
  1. Type `/mcp` in Claude Code
  2. Select "figma" from the list
  3. Click "Authenticate"
  4. Complete OAuth flow

### Usage
Once authenticated, you can:
- Reference Figma frames in prompts
- Generate pixel-perfect code from designs
- Auto-sync design changes to code

---

## 2. QGenda Features Analysis

### Core Features to Implement

#### Phase 1: Foundation (Week 1-2)
**Coordinator Scheduling & Resource Management**

1. **Coordinator Availability Management**
   - Track coordinator work schedules
   - Manage time off/PTO requests
   - Set availability windows
   - Handle shift preferences

2. **Study Coordinator Assignment**
   - Auto-assign coordinators based on:
     - Availability
     - Workload balance
     - Study expertise
     - Geographic location
   - Support manual overrides
   - Conflict detection

3. **Facility/Resource Scheduling**
   - Schedule exam rooms
   - Equipment allocation
   - Facility capacity management

#### Phase 2: Advanced Scheduling (Week 3-4)
**AI-Powered Visit Scheduling**

1. **Intelligent Visit Scheduling**
   - AI-based optimal time slot selection
   - Multi-constraint satisfaction:
     - Participant preferences
     - Coordinator availability
     - Facility capacity
     - Visit window requirements
   - Automatic rescheduling on conflicts

2. **Calendar Views**
   - Daily/Weekly/Monthly views
   - Resource-specific views (coordinator, participant, facility)
   - Drag-and-drop rescheduling
   - Color-coded by status/type

3. **Self-Service Scheduling**
   - Participant portal for:
     - View available slots
     - Book appointments
     - Request reschedules
     - View upcoming visits
   - Coordinator self-scheduling:
     - Claim open shifts
     - Request shift swaps
     - Submit PTO

#### Phase 3: Analytics & Optimization (Week 5-6)
**Workforce & Capacity Analytics**

1. **Scheduling Analytics Dashboard**
   - Coordinator utilization rates
   - Visit completion rates
   - No-show tracking
   - Capacity forecasting
   - Bottleneck identification

2. **Predictive Analytics**
   - 26-week visit forecasts
   - Resource demand prediction
   - Optimal staffing recommendations
   - Budget impact analysis

3. **On-Call Management**
   - On-call coordinator schedules
   - Emergency contact lookup
   - Automatic rotation
   - Coverage verification

#### Phase 4: Mobile & Integration (Week 7-8)
**Mobile Access & Advanced Features**

1. **Mobile App Features**
   - View schedules on mobile
   - Accept/decline appointments
   - Check-in for visits
   - Emergency notifications

2. **Integration Features**
   - Email/SMS notifications
   - Calendar sync (Google, Outlook)
   - Automated reminders
   - Waitlist management

---

## 3. Database Schema Enhancements

### New Models Required

```prisma
// Coordinator Availability
model CoordinatorAvailability {
  id            String   @id @default(cuid())
  coordinatorId String
  coordinator   User     @relation(fields: [coordinatorId], references: [id])
  dayOfWeek     Int      // 0-6 (Sunday-Saturday)
  startTime     String   // "09:00"
  endTime       String   // "17:00"
  effectiveFrom DateTime
  effectiveTo   DateTime?
  isRecurring   Boolean  @default(true)
  timezone      String   @default("America/New_York")

  @@index([coordinatorId])
  @@index([dayOfWeek])
}

// Time Off Requests
model TimeOffRequest {
  id            String   @id @default(cuid())
  coordinatorId String
  coordinator   User     @relation(fields: [coordinatorId], references: [id])
  startDate     DateTime
  endDate       DateTime
  requestType   String   // PTO, sick, personal, etc.
  status        String   // pending, approved, denied
  reason        String?
  approvedBy    String?
  approvedAt    DateTime?

  @@index([coordinatorId])
  @@index([status])
  @@index([startDate])
}

// Facility Resources
model Facility {
  id          String   @id @default(cuid())
  name        String
  type        String   // exam_room, lab, office
  location    String
  capacity    Int      @default(1)
  equipment   Json?    // Available equipment
  hoursOfOp   Json     // Operating hours
  active      Boolean  @default(true)

  bookings    FacilityBooking[]

  @@index([type])
  @@index([active])
}

model FacilityBooking {
  id               String          @id @default(cuid())
  facilityId       String
  facility         Facility        @relation(fields: [facilityId], references: [id])
  participantVisit String?
  visit            ParticipantVisit? @relation(fields: [participantVisit], references: [id])
  startTime        DateTime
  endTime          DateTime
  purpose          String
  bookedBy         String
  status           String          @default("booked") // booked, completed, cancelled

  @@index([facilityId])
  @@index([startTime])
  @@index([status])
}

// On-Call Schedule
model OnCallSchedule {
  id            String   @id @default(cuid())
  coordinatorId String
  coordinator   User     @relation(fields: [coordinatorId], references: [id])
  startDateTime DateTime
  endDateTime   DateTime
  scheduleType  String   // weekday, weekend, holiday
  priority      Int      @default(1) // 1=primary, 2=backup
  notes         String?

  @@index([coordinatorId])
  @@index([startDateTime])
  @@index([scheduleType])
}

// Enhanced ParticipantVisit with scheduling features
// Add to existing ParticipantVisit model:
model ParticipantVisit {
  // ... existing fields ...

  // New scheduling fields
  coordinatorId        String?
  assignedCoordinator  User?              @relation("VisitCoordinator", fields: [coordinatorId], references: [id])
  facilityBookingId    String?
  schedulingMethod     String?            @default("manual") // manual, auto, self_scheduled
  schedulingScore      Float?             // AI confidence in schedule optimality
  remindersSent        Int                @default(0)
  lastReminderAt       DateTime?
  checkInTime          DateTime?
  checkOutTime         DateTime?
  waitTime             Int?               // minutes
  noShowReason         String?
  rescheduledFrom      String?            // Previous visit ID
  rescheduledTo        String?            // New visit ID

  facilityBookings     FacilityBooking[]

  @@index([coordinatorId])
  @@index([schedulingMethod])
}

// Visit Waitlist
model VisitWaitlist {
  id            String      @id @default(cuid())
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id])
  studyVisitId  String
  studyVisit    StudyVisit  @relation(fields: [studyVisitId], references: [id])
  addedAt       DateTime    @default(now())
  priority      Int         @default(5) // 1-10
  preferences   Json?       // Time preferences
  contacted     Boolean     @default(false)

  @@index([studyVisitId])
  @@index([priority])
  @@index([contacted])
}

// Scheduling Analytics Cache
model SchedulingMetric {
  id               String   @id @default(cuid())
  metricDate       DateTime
  coordinatorId    String?
  studyId          String?

  // Metrics
  scheduledVisits  Int      @default(0)
  completedVisits  Int      @default(0)
  cancelledVisits  Int      @default(0)
  noShowVisits     Int      @default(0)
  utilizationRate  Float?   // 0.0 - 1.0
  avgWaitTime      Float?   // minutes
  avgVisitDuration Float?   // minutes

  createdAt        DateTime @default(now())

  @@unique([metricDate, coordinatorId, studyId])
  @@index([metricDate])
  @@index([coordinatorId])
  @@index([studyId])
}
```

---

## 4. API Endpoints

### Coordinator Management
- `GET /api/coordinators/availability` - Get coordinator availability
- `POST /api/coordinators/availability` - Set availability
- `GET /api/coordinators/schedule` - Get assigned visits
- `POST /api/coordinators/time-off` - Request time off
- `GET /api/coordinators/workload` - Get workload metrics

### Scheduling Engine
- `POST /api/scheduling/auto-schedule` - AI-powered auto-scheduling
- `POST /api/scheduling/find-slots` - Find available time slots
- `POST /api/scheduling/visit` - Schedule a visit
- `PUT /api/scheduling/visit/:id` - Reschedule visit
- `DELETE /api/scheduling/visit/:id` - Cancel visit
- `GET /api/scheduling/conflicts` - Detect scheduling conflicts

### Facility Management
- `GET /api/facilities` - List facilities
- `GET /api/facilities/:id/availability` - Check facility availability
- `POST /api/facilities/:id/book` - Book facility

### Analytics
- `GET /api/analytics/scheduling` - Scheduling metrics dashboard
- `GET /api/analytics/coordinator-utilization` - Coordinator utilization
- `GET /api/analytics/forecast` - Visit forecasting
- `GET /api/analytics/capacity` - Capacity analysis

### On-Call
- `GET /api/on-call/current` - Get current on-call coordinator
- `GET /api/on-call/schedule` - View on-call schedule
- `POST /api/on-call/schedule` - Create on-call shifts

---

## 5. UI Components

### Calendar Components
1. **ScheduleCalendar** - Main calendar view with drag-drop
2. **TimeSlotPicker** - Visual time slot selection
3. **ResourceTimeline** - Gantt-style resource view
4. **AvailabilityHeatmap** - Color-coded availability visualization

### Scheduling Widgets
1. **QuickScheduler** - Modal for rapid visit scheduling
2. **ConflictResolver** - UI for resolving scheduling conflicts
3. **WaitlistManager** - Waitlist viewer and auto-fill
4. **AutoScheduleWizard** - Guided AI scheduling flow

### Dashboards
1. **CoordinatorDashboard** - Personal schedule and assignments
2. **SchedulingAnalyticsDashboard** - Metrics and KPIs
3. **CapacityOverview** - Real-time capacity visualization
4. **OnCallBoard** - Current on-call status

### Mobile Views
1. **MobileSchedule** - Touch-optimized schedule view
2. **QuickCheckIn** - Visit check-in interface
3. **NotificationCenter** - Schedule alerts and reminders

---

## 6. AI-Powered Features

### Scheduling Algorithm
```typescript
interface SchedulingConstraints {
  participantPreferences: TimePreference[]
  coordinatorAvailability: Availability[]
  facilityCapacity: Capacity[]
  visitWindowRequirements: WindowConstraint[]
  studyRequirements: StudyConstraint[]
}

async function intelligentScheduling(
  visit: StudyVisit,
  participant: Participant,
  constraints: SchedulingConstraints
): Promise<ScheduledVisit> {
  // 1. Generate candidate time slots
  // 2. Score each slot based on:
  //    - Participant preference match
  //    - Coordinator workload balance
  //    - Facility utilization
  //    - Travel time optimization
  //    - Historical no-show patterns
  // 3. Select optimal slot
  // 4. Book resources
  // 5. Send notifications
}
```

### Predictive Analytics
- **Enrollment forecasting** using historical data
- **No-show prediction** based on participant patterns
- **Resource demand** 26-week lookahead
- **Optimal staffing** recommendations

---

## 7. UX Improvements

### Design Principles (QGenda-Inspired)
1. **At-a-Glance Clarity**: Color-coded status indicators
2. **Minimal Clicks**: Quick actions from any view
3. **Smart Defaults**: AI-suggested optimal choices
4. **Mobile-First**: Touch-optimized for tablets/phones
5. **Real-Time Updates**: WebSocket for live scheduling changes

### Color Coding
- 🟢 **Green**: Confirmed/Available
- 🟡 **Yellow**: Tentative/Pending
- 🔴 **Red**: Conflict/No-show
- 🔵 **Blue**: Completed
- ⚪ **Gray**: Cancelled

### Navigation Enhancements
- Add "Schedule" to main navigation
- Quick schedule button in header
- Floating action button for mobile scheduling
- Keyboard shortcuts for power users

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Update database schema
- [ ] Create coordinator availability API
- [ ] Build basic calendar component
- [ ] Implement coordinator assignment logic

### Phase 2: Scheduling Engine (Weeks 3-4)
- [ ] Build AI scheduling algorithm
- [ ] Create time slot finder
- [ ] Implement conflict detection
- [ ] Add drag-drop rescheduling
- [ ] Build facility booking system

### Phase 3: Self-Service (Weeks 5-6)
- [ ] Participant scheduling portal
- [ ] Coordinator self-scheduling
- [ ] Waitlist management
- [ ] Automated notifications

### Phase 4: Analytics (Week 7)
- [ ] Build analytics dashboard
- [ ] Implement forecasting
- [ ] Add utilization metrics
- [ ] Create capacity planning tools

### Phase 5: Mobile & Polish (Week 8)
- [ ] Mobile-optimized views
- [ ] Performance optimization
- [ ] User testing and refinement
- [ ] Documentation

---

## 9. Technical Stack Additions

### New Dependencies
```json
{
  "dependencies": {
    "@fullcalendar/react": "^6.1.11",
    "@fullcalendar/daygrid": "^6.1.11",
    "@fullcalendar/timegrid": "^6.1.11",
    "@fullcalendar/interaction": "^6.1.11",
    "date-fns": "^3.0.0",
    "react-beautiful-dnd": "^13.1.1",
    "recharts": "^2.12.0",
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0"
  }
}
```

---

## 10. Success Metrics

### Key Performance Indicators
1. **Scheduling Efficiency**
   - Time to schedule a visit: < 2 minutes
   - Auto-scheduling success rate: > 80%
   - Conflict resolution time: < 1 minute

2. **Resource Utilization**
   - Coordinator utilization: 70-85% (optimal range)
   - Facility utilization: > 60%
   - No-show rate: < 10%

3. **User Satisfaction**
   - Coordinator satisfaction: > 4/5
   - Participant satisfaction: > 4.5/5
   - System adoption rate: > 90% within 3 months

4. **Operational Impact**
   - Reduce scheduling admin time: 50%
   - Increase visits per coordinator: 20%
   - Improve visit completion rate: 15%

---

## 11. Figma Integration Workflow

### Design-to-Code Process
1. **Design in Figma**: Create scheduling UI mockups
2. **Reference in Claude Code**:
   ```
   "Using frame 'Schedule Calendar View' from Figma,
   implement the calendar component"
   ```
3. **Generate Code**: Claude creates pixel-perfect implementation
4. **Iterate**: Refine based on user feedback
5. **Sync**: Update code when Figma designs change

### Recommended Figma Frames to Create
- Schedule Calendar (Weekly View)
- Time Slot Picker Modal
- Coordinator Dashboard
- Analytics Dashboard
- Mobile Schedule View
- Quick Scheduler Widget
- Conflict Resolution Dialog

---

## 12. Next Steps

### Immediate Actions
1. ✅ **Authenticate Figma MCP**: Type `/mcp` in Claude Code
2. **Create Figma Designs**: Design key scheduling interfaces
3. **Database Migration**: Add new scheduling models
4. **API Development**: Build coordinator and scheduling APIs
5. **Component Library**: Create reusable scheduling components

### Development Priority
1. **High Priority**: Coordinator availability, basic scheduling
2. **Medium Priority**: AI scheduling, analytics dashboard
3. **Low Priority**: Mobile app, advanced forecasting

---

## Conclusion

This implementation will transform the IRB Management System from a basic research tracking tool into a comprehensive, AI-powered scheduling platform inspired by QGenda's best practices. The phased approach ensures manageable development while delivering value at each stage.

**Estimated Timeline**: 8 weeks
**Estimated Effort**: 320-400 hours
**Expected ROI**: 50% reduction in scheduling overhead, 20% increase in coordinator efficiency

---

*Document created: 2025-10-26*
*Last updated: 2025-10-26*
