import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Flag,
  Filter,
  Plus,
  Search,
  ChevronRight,
} from "lucide-react";

export default function TasksPage() {
  const tasks = [
    {
      id: 1,
      title: "Submit IRB modifications for STD-2024-005",
      study: "Gene Therapy for Rare Metabolic Disorders",
      assignee: "Dr. Emily Rodriguez",
      dueDate: "2024-03-25",
      priority: "high",
      status: "in_progress",
      category: "IRB",
      description: "Address reviewer comments and resubmit modified protocol",
    },
    {
      id: 2,
      title: "Review consent form updates",
      study: "Sleep Quality Assessment Device Trial",
      assignee: "Dr. Sarah Chen",
      dueDate: "2024-03-28",
      priority: "medium",
      status: "pending",
      category: "Documentation",
      description: "Review and approve updated patient consent forms",
    },
    {
      id: 3,
      title: "Schedule DSMB meeting",
      study: "Omega-3 Fatty Acids in Mild Cognitive Impairment",
      assignee: "Coordinator Team",
      dueDate: "2024-04-05",
      priority: "medium",
      status: "pending",
      category: "Meeting",
      description: "Coordinate and schedule quarterly DSMB review",
    },
    {
      id: 4,
      title: "Submit annual IRB renewal",
      study: "Novel Biomarkers for Heart Failure Detection",
      assignee: "Dr. James Wilson",
      dueDate: "2024-04-15",
      priority: "high",
      status: "not_started",
      category: "IRB",
      description: "Prepare and submit annual renewal documentation",
    },
    {
      id: 5,
      title: "Update budget allocation",
      study: "Behavioral Therapy for Anxiety Disorders",
      assignee: "Finance Team",
      dueDate: "2024-03-30",
      priority: "low",
      status: "pending",
      category: "Finance",
      description: "Review and update Q2 budget allocations",
    },
    {
      id: 6,
      title: "Complete adverse event report",
      study: "Gene Therapy for Rare Metabolic Disorders",
      assignee: "Dr. Emily Rodriguez",
      dueDate: "2024-03-22",
      priority: "critical",
      status: "in_progress",
      category: "Safety",
      description: "File AE report within 24-hour window",
    },
  ];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Flag className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      not_started: { className: "bg-gray-100 text-gray-800", label: "Not Started" },
      pending: { className: "bg-blue-100 text-blue-800", label: "Pending" },
      in_progress: { className: "bg-yellow-100 text-yellow-800", label: "In Progress" },
      completed: { className: "bg-green-100 text-green-800", label: "Completed" },
      overdue: { className: "bg-red-100 text-red-800", label: "Overdue" },
    };

    const config = statusConfig[status] || statusConfig.not_started;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, string> = {
      IRB: "bg-purple-50 text-purple-700",
      Documentation: "bg-blue-50 text-blue-700",
      Meeting: "bg-green-50 text-green-700",
      Finance: "bg-yellow-50 text-yellow-700",
      Safety: "bg-red-50 text-red-700",
    };

    return (
      <Badge variant="outline" className={categoryConfig[category] || "bg-gray-50 text-gray-700"}>
        {category}
      </Badge>
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, className: "text-red-600" };
    if (diffDays === 0) return { text: "Due today", className: "text-orange-600" };
    if (diffDays === 1) return { text: "Due tomorrow", className: "text-yellow-600" };
    if (diffDays <= 7) return { text: `${diffDays} days`, className: "text-yellow-600" };
    return { text: `${diffDays} days`, className: "text-muted-foreground" };
  };

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
              <a href="/tasks" className="text-sm font-medium text-primary">Tasks</a>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tasks & Workflows</h2>
            <p className="text-muted-foreground">Track and manage research study tasks</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">8 completed this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical/High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">3</div>
              <p className="text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">2 overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Average completion: 65%</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="irb">IRB</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task) => {
            const dueInfo = getDaysUntilDue(task.dueDate);
            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(task.priority)}
                            <h3 className="font-medium">{task.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{task.study}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{task.assignee}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className={dueInfo.className}>{dueInfo.text}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(task.status)}
                          {getCategoryBadge(task.category)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}