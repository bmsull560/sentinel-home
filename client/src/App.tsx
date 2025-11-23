import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Overview from "./pages/Overview";
import Alerts from "./pages/Alerts";
import Devices from "./pages/Devices";
import Vulnerabilities from "./pages/Vulnerabilities";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Overview} />
      <Route path={"/alerts"} component={Alerts} />
      <Route path={"/devices"} component={Devices} />
      <Route path={"/vulnerabilities"} component={Vulnerabilities} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
