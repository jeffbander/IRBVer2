import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  LineChart,
  PieChart,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function ReportsPage() {
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
              <a href="/reports" className="text-sm font-medium text-primary">Reports</a>
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
            <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground">Monitor study progress and compliance metrics</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="30">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollment</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,284</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IRB Approval Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+2.1% from last quarter</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Studies</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>7 in startup phase</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$8.4M</div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>68% utilized</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Study Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Study Status Distribution</CardTitle>
                  <CardDescription>Current status of all research studies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-muted/10 rounded">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Pie Chart Visualization</p>
                      <div className="mt-4 space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-600 rounded" />
                          <span className="text-sm">Approved: 12 studies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600 rounded" />
                          <span className="text-sm">Submitted: 5 studies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-600 rounded" />
                          <span className="text-sm">Pre-Review: 4 studies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-600 rounded" />
                          <span className="text-sm">Modifications: 3 studies</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly IRB Submissions</CardTitle>
                  <CardDescription>Submission trends over the past year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-muted/10 rounded">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Line Chart Visualization</p>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Q1 2024</p>
                          <p className="text-muted-foreground">18 submissions</p>
                        </div>
                        <div>
                          <p className="font-medium">Q2 2024</p>
                          <p className="text-muted-foreground">22 submissions</p>
                        </div>
                        <div>
                          <p className="font-medium">Q3 2024</p>
                          <p className="text-muted-foreground">15 submissions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates across all studies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      study: "Gene Therapy for Rare Metabolic Disorders",
                      action: "IRB modifications submitted",
                      time: "2 hours ago",
                      icon: <FileText className="h-4 w-4" />
                    },
                    {
                      study: "Sleep Quality Assessment Device Trial",
                      action: "New participant enrolled",
                      time: "5 hours ago",
                      icon: <Users className="h-4 w-4" />
                    },
                    {
                      study: "Omega-3 Fatty Acids Study",
                      action: "Safety report filed",
                      time: "1 day ago",
                      icon: <AlertCircle className="h-4 w-4" />
                    },
                    {
                      study: "Novel Biomarkers for Heart Failure",
                      action: "Quarterly report completed",
                      time: "2 days ago",
                      icon: <CheckCircle className="h-4 w-4" />
                    },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">{activity.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.study}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Metrics</CardTitle>
                <CardDescription>Participant recruitment and retention statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
                  <div className="text-center">
                    <BarChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Enrollment data visualization would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Dashboard</CardTitle>
                <CardDescription>Regulatory compliance and protocol adherence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
                  <p className="text-sm text-muted-foreground">Compliance metrics would appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Budget utilization and financial projections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
                  <p className="text-sm text-muted-foreground">Financial charts would appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Safety Monitoring</CardTitle>
                <CardDescription>Adverse events and safety reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
                  <p className="text-sm text-muted-foreground">Safety data would appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}