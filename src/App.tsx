import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { AdminViewProvider } from "@/contexts/AdminViewContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import FocusProjects from "./pages/FocusProjects";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import MyTasks from "./pages/MyTasks";
import TaskDetail from "./pages/TaskDetail";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Workspace from "./pages/Workspace";
import Culture from "./pages/workspace/Culture";
import CultureForm from "./pages/workspace/CultureForm";
import Vision from "./pages/workspace/Vision";
import VisionForm from "./pages/workspace/VisionForm";
import Processes from "./pages/workspace/Processes";
import ProcessForm from "./pages/workspace/ProcessForm";
import Notes from "./pages/workspace/Notes";
import NoteForm from "./pages/workspace/NoteForm";
import NoteDetail from "./pages/workspace/NoteDetail";
import Flows from "./pages/workspace/Flows";
import FlowEditor from "./pages/workspace/FlowEditor";
import GettingStarted from "./pages/workspace/GettingStarted";
import GettingStartedForm from "./pages/workspace/GettingStartedForm";
import GettingStartedDetail from "./pages/workspace/GettingStartedDetail";
import Positions from "./pages/Positions";
import Inventory from "./pages/Inventory";
import PositionDetail from "./pages/PositionDetail";
import RoutineTaskDetail from "./pages/RoutineTaskDetail";
import BriefingRepository from "./pages/BriefingRepository";
import BriefingDocument from "./pages/BriefingDocument";
import WorkspaceAdmin from "./pages/WorkspaceAdmin";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import TeamManagement from "./pages/TeamManagement";
import TeamMemberPermissions from "./pages/TeamMemberPermissions";
import WorkspaceManagement from "./pages/WorkspaceManagement";
import AIAssistant from "./pages/AIAssistant";
import WorkloadOverview from "./pages/WorkloadOverview";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import { ViewModeProvider } from "@/contexts/ViewModeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ViewModeProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <AdminProvider>
                <AdminViewProvider>
                  <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/workspace" element={<Workspace />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/focus-projects" element={<FocusProjects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/my-tasks" element={<MyTasks />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/workspace/culture" element={<Culture />} />
                  <Route path="/workspace/culture/edit" element={<CultureForm />} />
                  <Route path="/workspace/vision" element={<Vision />} />
                  <Route path="/workspace/vision/edit" element={<VisionForm />} />
                  <Route path="/workspace/processes" element={<Processes />} />
                  <Route path="/workspace/processes/new" element={<ProcessForm />} />
                  <Route path="/workspace/processes/:id/edit" element={<ProcessForm />} />
                  <Route path="/workspace/notes" element={<Notes />} />
                  <Route path="/workspace/notes/new" element={<NoteForm />} />
                  <Route path="/workspace/notes/:id" element={<NoteDetail />} />
                  <Route path="/workspace/notes/:id/edit" element={<NoteForm />} />
                  <Route path="/workspace/flows" element={<Flows />} />
                  <Route path="/workspace/flows/:id" element={<FlowEditor />} />
                  <Route path="/workspace/getting-started" element={<GettingStarted />} />
                  <Route path="/workspace/getting-started/new" element={<GettingStartedForm />} />
                  <Route path="/workspace/getting-started/:id" element={<GettingStartedDetail />} />
                  <Route path="/workspace/getting-started/:id/edit" element={<GettingStartedForm />} />
                  <Route path="/positions" element={<Positions />} />
                  <Route path="/positions/:id" element={<PositionDetail />} />
                  <Route path="/routine-tasks/:id" element={<RoutineTaskDetail />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/briefings" element={<BriefingRepository />} />
                  <Route path="/briefing/:briefingId" element={<BriefingDocument />} />
                  <Route path="/workspace/admin" element={<WorkspaceAdmin />} />
                  <Route path="/workspace/setup" element={<WorkspaceSetup />} />
                  <Route path="/team" element={<TeamManagement />} />
                  <Route path="/team/:userId" element={<TeamMemberPermissions />} />
                  <Route path="/workspaces" element={<WorkspaceManagement />} />
                  <Route path="/ai-assistant" element={<AIAssistant />} />
                  <Route path="/workload" element={<WorkloadOverview />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                  <Route path="/admin/plans" element={<AdminPlans />} />
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/audit" element={<AdminAuditLogs />} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </AdminViewProvider>
              </AdminProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ViewModeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
