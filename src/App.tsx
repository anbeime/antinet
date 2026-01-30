import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import NPUAnalysis from "@/pages/NPUAnalysis";
import NPUDashboard from "@/pages/NPUDashboard";
import PDFAnalysis from "@/pages/PDFAnalysis";
import PPTAnalysis from "@/pages/PPTAnalysis";
import ExcelAnalysis from "@/pages/ExcelAnalysis";
import DataManagement from "@/pages/DataManagement";
import BatchProcess from "@/pages/BatchProcess";
import AgentSystem from "@/pages/AgentSystem";
import SkillCenter from "@/pages/SkillCenter";
import { useState } from "react";
import { AuthContext } from '@/contexts/authContext';


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
      <AuthContext.Provider
        value={{ isAuthenticated, setIsAuthenticated, logout }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/npu-analysis" element={<NPUAnalysis />} />
          <Route path="/npu-dashboard" element={<NPUDashboard />} />
          <Route path="/pdf-analysis" element={<PDFAnalysis />} />
          <Route path="/ppt-analysis" element={<PPTAnalysis />} />
          <Route path="/excel-analysis" element={<ExcelAnalysis />} />
          <Route path="/data-management" element={<DataManagement />} />
          <Route path="/batch-process" element={<BatchProcess />} />
          <Route path="/agent-system" element={<AgentSystem />} />
          <Route path="/skill-center" element={<SkillCenter />} />
        </Routes>
      </AuthContext.Provider>
  );
}
