import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Reader from "./pages/Reader";
import ImportBook from "./pages/ImportBook";
import VersionReader from "./pages/VersionReader";
import ImportFullBook from "./pages/ImportFullBook";
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/read" element={<Navigate to="/read/introduction" replace />} />
              <Route path="/read/:slug" element={<Reader />} />
              <Route path="/import" element={<ImportBook />} />
              <Route path="/import-full" element={<ImportFullBook />} />
              <Route path="/book/the-divine-gene/:version/:slug" element={<VersionReader />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
