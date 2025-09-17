import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

export default function StudiesPage() {
  const studies = [
    {
      id: "STD-2024-001",
      title: "Omega-3 Fatty Acids in Mild Cognitive Impairment",
      type: "Drug (IND)",
      status: "pre_review",
      pi: "Dr. Patricia Lee",
      enrollment: "45/100",
      startDate: "2024-01-15",
      irbNumber: "IRB-2024-0234",
      risk: "minimal",
    },
    {
      id: "STD-2024-002",
      title: "Sleep Quality Assessment Device Trial",
      type: "Device (IDE)",
      status: "approved",
      pi: "Dr. Sarah Chen",
      enrollment: "78/150",
      startDate: "2024-02-01",
      irbNumber: "IRB-2024-0156",
      risk: "moderate",
    },
    {
      id: "STD-2024-003",
      title: "Behavioral Therapy for Anxiety Disorders",
      type: "Behavioral",
      status: "submitted",
      pi: "Dr. Michael Brown",
      enrollment: "0/200",
      startDate: "2024-04-01",
      irbNumber: "IRB-2024-0412",
      risk: "minimal",
    },
    {
      id: "STD-2024-004",
      title: "Novel Biomarkers for Heart Failure Detection",
      type: "Observational",
      status: "approved",
      pi: "Dr. James Wilson",
      enrollment: "125/300",
      startDate: "2023-11-15",
      irbNumber: "IRB-2023-0892",
      risk: "minimal",
    },
    {
      id: "STD-2024-005",
      title: "Gene Therapy for Rare Metabolic Disorders",
      type: "Drug (IND)",
      status: "modifications",
      pi: "Dr. Emily Rodriguez",
      enrollment: "12/50",
      startDate: "2024-03-15",
      irbNumber: "IRB-2024-0334",
      risk: "high",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "submitted":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "pre_review":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "modifications":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "not_approved":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      pre_review: "bg-yellow-100 text-yellow-800",
      modifications: "bg-orange-100 text-orange-800",
      approved: "bg-green-100 text-green-800",
      not_approved: "bg-red-100 text-red-800",
    };

    const statusLabels: Record<string, string> = {
      draft: "Draft",
      submitted: "Submitted",
      pre_review: "Pre-Review",
      modifications: "Modifications",
      approved: "Approved",
      not_approved: "Not Approved",
    };

    return (
      <Badge className={statusClasses[status] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const riskClasses: Record<string, string> = {
      minimal: "bg-green-50 text-green-700",
      moderate: "bg-yellow-50 text-yellow-700",
      high: "bg-red-50 text-red-700",
    };

    return (
      <Badge variant="outline" className={riskClasses[risk]}>
        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
      </Badge>
    );
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
              <a href="/studies" className="text-sm font-medium text-primary">Studies</a>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Research Studies</h2>
            <p className="text-muted-foreground">Manage and monitor all clinical research studies</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Study
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search studies by title, PI, or IRB number..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Study Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="drug">Drug (IND)</SelectItem>
                  <SelectItem value="device">Device (IDE)</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="observational">Observational</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pre_review">Pre-Review</SelectItem>
                  <SelectItem value="modifications">Modifications</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="not_approved">Not Approved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Studies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Studies</CardTitle>
            <CardDescription>
              {studies.length} studies found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Study ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>PI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>IRB Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studies.map((study) => (
                  <TableRow key={study.id}>
                    <TableCell className="font-medium">{study.id}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        {getStatusIcon(study.status)}
                        <div>
                          <div className="font-medium">{study.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Started {study.startDate}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{study.type}</Badge>
                    </TableCell>
                    <TableCell>{study.pi}</TableCell>
                    <TableCell>{getStatusBadge(study.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">{study.enrollment}</div>
                        <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(parseInt(study.enrollment.split("/")[0]) / parseInt(study.enrollment.split("/")[1])) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRiskBadge(study.risk)}</TableCell>
                    <TableCell className="text-sm">{study.irbNumber}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}