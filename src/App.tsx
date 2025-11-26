import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
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
import Positions from "./pages/Positions";
import PositionDetail from "./pages/PositionDetail";
import BriefingRepository from "./pages/BriefingRepository";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Workspace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workspace/culture" element={<Culture />} />
            <Route path="/workspace/vision" element={<Vision />} />
            <Route path="/workspace/processes" element={<Processes />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/positions/:id" element={<PositionDetail />} />
            <Route path="/briefings" element={<BriefingRepository />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;