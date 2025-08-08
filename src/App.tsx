import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Reader from "./pages/Reader";
import ImportBook from "./pages/ImportBook";
import VersionReader from "./pages/VersionReader";
import ImportFullBook from "./pages/ImportFullBook";
import Versions from "./pages/Versions";
import { Button } from "@/components/ui/button";
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <nav className="container flex h-14 items-center justify-between">
                <Link to="/" className="font-semibold">The Divine Gene</Link>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/">Home</Link>
                  </Button>
                </div>
              </nav>
            </header>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/read" element={<Navigate to="/read/introduction" replace />} />
              <Route path="/read/:slug" element={<Reader />} />
              <Route path="/import" element={<ImportBook />} />
              <Route path="/import-full" element={<ImportFullBook />} />
              <Route path="/versions" element={<Versions />} />
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
