import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import NPUAnalysis from "@/pages/NPUAnalysis";
import NPUDashboard from "@/pages/NPUDashboard";
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
      </Routes>
    </AuthContext.Provider>
  );
}
