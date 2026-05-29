import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import NPUAnalysis from "@/pages/NPUAnalysis";
import NPUDashboard from "@/pages/NPUDashboard";
import PDFAnalysis from "@/pages/PDFAnalysis";
import PPTAnalysis from "@/pages/PPTAnalysis";
import ExcelAnalysis from "@/pages/ExcelAnalysis";
import ReportAutomation from "@/pages/ReportAutomation";
import OfficeDocs from "@/pages/OfficeDocs";
import PDFViewer from "@/pages/PDFViewer";
import PPTViewer from "@/pages/PPTViewer";
import MindMap from "@/pages/MindMap";
import KnowledgeGraphView from "@/pages/KnowledgeGraphView";
import KnowledgeGraphWorkbenchPage from "@/pages/KnowledgeGraphWorkbenchPage";
import DataManagement from "@/pages/DataManagement";
import BatchProcess from "@/pages/BatchProcess";
import AgentSystem from "@/pages/AgentSystem";
import SkillCenter from "@/pages/SkillCenter";
import MultiModel from "@/pages/MultiModel";
import FormatConverter from "@/pages/FormatConverter";
import VirtualOfficeMeeting from "@/pages/VirtualOfficeMeeting";
import GTDTaskManager from "@/pages/GTDTaskManager";
import GeniePlayground from "@/pages/GeniePlayground";
import GenieNPUTest from "@/pages/GenieNPUTest";
import HermesManager from "@/pages/HermesManager";
import FourColorCardPanel from "@/components/FourColorCardPanel";

import MarkdownConverter from "@/pages/MarkdownConverter";
import PPTStructureDraft from "@/pages/PPTStructureDraft";
import BookSkillCenter from "@/pages/BookSkillCenter";
import { ReminderNotification } from "@/components/ReminderNotification";
import { AuthProvider } from '@/contexts/authContext';

export default function App() {
  return (
    <AuthProvider>
      <ReminderNotification />
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/npu-analysis" element={<NPUAnalysis />} />
          <Route path="/npu-dashboard" element={<NPUDashboard />} />
          <Route path="/pdf-analysis" element={<PDFAnalysis />} />
          <Route path="/ppt-analysis" element={<PPTAnalysis />} />
          <Route path="/excel-analysis" element={<ExcelAnalysis />} />
          <Route path="/report-automation" element={<ReportAutomation />} />
          <Route path="/office-docs" element={<OfficeDocs />} />
<Route path="/pdf-viewer" element={<PDFViewer />} />
          <Route path="/pdf-viewer/markdown" element={<MarkdownConverter />} />
          <Route path="/ppt-viewer" element={<PPTViewer />} />
          <Route path="/mindmap" element={<MindMap />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphView />} />
          <Route path="/knowledge-workbench" element={<KnowledgeGraphWorkbenchPage />} />
          <Route path="/data-management" element={<DataManagement />} />
          <Route path="/batch-process" element={<BatchProcess />} />
          <Route path="/agent-system" element={<AgentSystem />} />
          <Route path="/skill-center" element={<SkillCenter />} />
          <Route path="/multi-model" element={<MultiModel />} />
          <Route path="/format-converter" element={<FormatConverter />} />
          <Route path="/virtual-office-meeting" element={<VirtualOfficeMeeting />} />
          <Route path="/gtd-tasks" element={<GTDTaskManager />} />
          <Route path="/genie-playground" element={<GeniePlayground />} />
          <Route path="/genie-npu-test" element={<GenieNPUTest />} />
          <Route path="/hermes-manager" element={<HermesManager />} />
          <Route path="/book-skill" element={<BookSkillCenter />} />
          <Route path="/four-color-cards" element={<FourColorCardPanel />} />
          <Route path="/ppt-structure" element={<PPTStructureDraft />} />
          <Route path="/remotion" element={
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
              <Home initialTab="remotion" />
            </div>
          } />
        </Routes>
    </AuthProvider>
  );
}