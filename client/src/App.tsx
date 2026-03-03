import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Overview from "./pages/Overview";
import Devices from "./pages/Devices";
import Vulnerabilities from "./pages/Vulnerabilities";
import Alerts from "./pages/Alerts";
import AgentConsole from "./pages/AgentConsole";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Overview} />
      <Route path="/dashboard/devices" component={Devices} />
      <Route path="/dashboard/vulnerabilities" component={Vulnerabilities} />
      <Route path="/dashboard/alerts" component={Alerts} />
      <Route path="/dashboard/agent" component={AgentConsole} />
      <Route path="/dashboard/team" component={Team} />
      <Route path="/dashboard/billing" component={Billing} />
      <Route path="/dashboard/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
