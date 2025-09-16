import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Settings,
  Shield,
  Database,
  FileText,
  Key,
  Bell,
  Lock,
  UserPlus,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AdminPage() {
  const users = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      email: "sarah.chen@mountsinai.org",
      role: "Principal Investigator",
      department: "Cardiology",
      status: "active",
      lastLogin: "2024-03-20 14:23",
      studies: 3
    },
    {
      id: 2,
      name: "Dr. Michael Brown",
      email: "michael.brown@mountsinai.org",
      role: "Co-Investigator",
      department: "Psychiatry",
      status: "active",
      lastLogin: "2024-03-20 09:15",
      studies: 2
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.rodriguez@mountsinai.org",
      role: "Study Coordinator",
      department: "Research Operations",
      status: "active",
      lastLogin: "2024-03-19 16:45",
      studies: 5
    },
    {
      id: 4,
      name: "James Wilson",
      email: "james.wilson@mountsinai.org",
      role: "IRB Administrator",
      department: "IRB Office",
      status: "active",
      lastLogin: "2024-03-20 11:30",
      studies: 0
    },
    {
      id: 5,
      name: "Dr. Patricia Lee",
      email: "patricia.lee@mountsinai.org",
      role: "Principal Investigator",
      department: "Neurology",
      status: "inactive",
      lastLogin: "2024-02-15 13:20",
      studies: 1
    },
  ];

  const auditLogs = [
    {
      id: 1,
      user: "Dr. Sarah Chen",
      action: "Modified study protocol",
      target: "STD-2024-002",
      timestamp: "2024-03-20 14:23:45",
      ip: "192.168.1.100"
    },
    {
      id: 2,
      user: "Emily Rodriguez",
      action: "Added new participant",
      target: "STD-2024-001",
      timestamp: "2024-03-20 13:15:22",
      ip: "192.168.1.102"
    },
    {
      id: 3,
      user: "James Wilson",
      action: "Approved IRB submission",
      target: "IRB-2024-0412",
      timestamp: "2024-03-20 11:30:18",
      ip: "192.168.1.105"
    },
    {
      id: 4,
      user: "Dr. Michael Brown",
      action: "Downloaded report",
      target: "Monthly Enrollment Report",
      timestamp: "2024-03-20 09:45:33",
      ip: "192.168.1.103"
    },
  ];

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
              <a href="/admin" className="text-sm font-medium text-primary">Admin</a>
              <Button variant="outline" size="sm">Sign Out</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Administration</h2>
          <p className="text-muted-foreground">Manage users, permissions, and system settings</p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* User Stats */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">142</div>
                  <p className="text-xs text-muted-foreground">8 pending invites</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">38</div>
                  <p className="text-xs text-muted-foreground">27% of total users</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">PIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">Principal Investigators</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Coordinators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">56</div>
                  <p className="text-xs text-muted-foreground">Study Coordinators</p>
                </CardContent>
              </Card>
            </div>

            {/* User Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and roles</CardDescription>
                  </div>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Studies</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{user.studies}</TableCell>
                        <TableCell>
                          <Badge className={user.status === 'active'
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.lastLogin}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure permissions for different user roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    "Principal Investigator",
                    "Co-Investigator",
                    "Study Coordinator",
                    "IRB Administrator",
                    "Data Manager"
                  ].map((role) => (
                    <div key={role} className="space-y-3">
                      <h3 className="font-medium">{role}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${role}-create`}>Create Studies</Label>
                          <Switch id={`${role}-create`} defaultChecked={role === "Principal Investigator"} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${role}-edit`}>Edit Studies</Label>
                          <Switch id={`${role}-edit`} defaultChecked={role !== "Data Manager"} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${role}-delete`}>Delete Studies</Label>
                          <Switch id={`${role}-delete`} defaultChecked={role === "Principal Investigator"} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${role}-approve`}>Approve IRB</Label>
                          <Switch id={`${role}-approve`} defaultChecked={role === "IRB Administrator"} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" defaultValue="Mount Sinai Health System" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" defaultValue="America/New_York" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Input id="date-format" defaultValue="MM/DD/YYYY" />
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure security and authentication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="2fa">Two-Factor Authentication</Label>
                    <Switch id="2fa" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="session">Session Timeout (minutes)</Label>
                    <Input id="session" type="number" defaultValue="30" className="w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password Complexity</Label>
                    <Switch id="password" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="audit">Audit Logging</Label>
                    <Switch id="audit" defaultChecked />
                  </div>
                  <Button>Update Security</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>System activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {log.target}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{log.timestamp}</TableCell>
                        <TableCell className="text-sm font-mono">{log.ip}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>REDCap Integration</CardTitle>
                  <CardDescription>Electronic data capture system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Connected</span>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last sync: 2024-03-20 14:30
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Epic EHR</CardTitle>
                  <CardDescription>Electronic health records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Connected</span>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    API Version: 2.1.0
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>OnCore CTMS</CardTitle>
                  <CardDescription>Clinical trial management</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                      <span className="text-sm">Pending Setup</span>
                    </div>
                    <Button variant="outline" size="sm">Setup</Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requires configuration
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Slack Notifications</CardTitle>
                  <CardDescription>Team communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-sm">Disconnected</span>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Not configured
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}