import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./utils/trpc";
import Main from "./pages/Main";
import { Toaster } from "./components/Toast";
import { ConfirmHost } from "./components/ConfirmDialog";
import "./App.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
      <ConfirmHost />
    </QueryClientProvider>
  );
}

export default App;
