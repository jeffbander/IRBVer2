import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// This will be the dashboard page
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-primary">Research Study Management</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="/studies" className="text-sm font-medium hover:text-primary">Studies</a>
              <a href="/tasks" className="text-sm font-medium hover:text-primary">Tasks</a>
              <a href="/reports" className="text-sm font-medium hover:text-primary">Reports</a>
              <a href="/admin" className="text-sm font-medium hover:text-primary">Admin</a>
              <Button variant="outline" size="sm">Sign Out</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to the Research Study Management System</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Studies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+3 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending IRB</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">2 modifications requested</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground">Across all studies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2.4M</div>
              <p className="text-xs text-muted-foreground">Active studies</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Studies & Tasks */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Studies */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Studies</CardTitle>
              <CardDescription>Your most recently updated studies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Omega-3 in Mild Cognitive Impairment", type: "Drug (IND)", status: "pre_review", pi: "Dr. Pat Lee" },
                  { title: "Sleep Quality Assessment Device", type: "Device (IDE)", status: "approved", pi: "Dr. Sarah Chen" },
                  { title: "Behavioral Therapy for Anxiety", type: "Behavioral", status: "submitted", pi: "Dr. Michael Brown" },
                ].map((study, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer">
                    <div>
                      <p className="font-medium">{study.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{study.type}</span>
                        <span className="text-xs text-muted-foreground">• PI: {study.pi}</span>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeClass(study.status)}>
                      {formatStatus(study.status)}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">View All Studies</Button>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Tasks requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Submit IRB modifications", study: "Omega-3 Study", due: "2 days", priority: "high" },
                  { title: "Review consent form", study: "Sleep Device Study", due: "5 days", priority: "medium" },
                  { title: "Update budget allocation", study: "Behavioral Study", due: "1 week", priority: "medium" },
                  { title: "Schedule team meeting", study: "Omega-3 Study", due: "1 week", priority: "low" },
                ].map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer">
                    <div className="flex items-center gap-3">
                      {task.priority === "high" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : task.priority === "medium" ? (
                        <Activity className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.study}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Due in {task.due}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">View All Tasks</Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Create New Study
              </Button>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Team
              </Button>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                IRB Calendar
              </Button>
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Budget Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Helper functions
function getStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    submitted: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    pre_review: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    approved: "bg-green-100 text-green-800 hover:bg-green-100",
  };
  return statusClasses[status] || "bg-gray-100 text-gray-800";
}

function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    pre_review: "Pre-Review",
    approved: "Approved",
  };
  return statusLabels[status] || status;
}