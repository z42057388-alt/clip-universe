import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WatchPage from "./pages/WatchPage";
import ChatPage from "./pages/ChatPage";
import ChannelPage from "./pages/ChannelPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import { AuthPage } from "./pages/AuthPage";
import AIChatPage from "./pages/AIChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/channel/:userId" element={<ChannelPage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/ai-chat" element={<AIChatPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
