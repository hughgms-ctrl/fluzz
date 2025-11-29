import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import MyTasks from "./pages/MyTasks";
import TaskDetail from "./pages/TaskDetail";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Workspace from "./pages/Workspace";
import Culture from "./pages/workspace/Culture";
import Vision from "./pages/workspace/Vision";
import Processes from "./pages/workspace/Processes";
import GettingStarted from "./pages/workspace/GettingStarted";
import Positions from "./pages/Positions";
import Sectors from "./pages/Sectors";
import Inventory from "./pages/Inventory";
import PositionDetail from "./pages/PositionDetail";
import BriefingRepository from "./pages/BriefingRepository";
import BriefingDocument from "./pages/BriefingDocument";
import WorkspaceAdmin from "./pages/WorkspaceAdmin";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import TeamManagement from "./pages/TeamManagement";
import TeamMemberPermissions from "./pages/TeamMemberPermissions";
import WorkspaceManagement from "./pages/WorkspaceManagement";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Home />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workspace/culture" element={<Culture />} />
            <Route path="/workspace/vision" element={<Vision />} />
            <Route path="/workspace/processes" element={<Processes />} />
            <Route path="/workspace/getting-started" element={<GettingStarted />} />
            <Route path="/workspace/members" element={<WorkspaceMembers />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/positions/:id" element={<PositionDetail />} />
            <Route path="/sectors" element={<Sectors />} />
            <Route path="/inventory" element={<Inventory />} />
          <Route path="/briefings" element={<BriefingRepository />} />
          <Route path="/briefing/:briefingId" element={<BriefingDocument />} />
          <Route path="/workspace/admin" element={<WorkspaceAdmin />} />
          <Route path="/workspace/setup" element={<WorkspaceSetup />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/team/:userId" element={<TeamMemberPermissions />} />
          <Route path="/workspaces" element={<WorkspaceManagement />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;