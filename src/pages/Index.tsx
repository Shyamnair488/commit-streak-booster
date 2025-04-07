
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import RepositoryConfig, { RepositoryConfigData } from "@/components/RepositoryConfig";
import CommitScheduler, { CommitSettings } from "@/components/CommitScheduler";
import CommitStats from "@/components/CommitStats";
import { githubService } from "@/utils/githubService";
import { schedulerService } from "@/utils/schedulerService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [configuring, setConfiguring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({
    totalCommits: 0,
    streakDays: 0,
    lastCommitDate: null,
    daily: []
  });

  useEffect(() => {
    // Load configuration and stats on component mount
    const config = githubService.getConfig();
    if (config) {
      setIsConfigured(true);
    }

    // Load scheduler state
    const active = schedulerService.isActive();
    setIsActive(active);
    
    // Restore scheduler if it was active
    if (!active) {
      schedulerService.restoreState();
      setIsActive(schedulerService.isActive());
    }

    // Load stats
    updateStats();

    // Set up interval to update stats
    const interval = setInterval(updateStats, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  const updateStats = () => {
    const currentStats = githubService.getStats();
    setStats(currentStats);
  };

  const handleSaveConfig = async (config: RepositoryConfigData) => {
    setConfiguring(true);
    try {
      const success = await githubService.setConfig(config);
      if (success) {
        setIsConfigured(true);
      }
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setConfiguring(false);
    }
  };

  const handleStartScheduler = (settings: CommitSettings) => {
    schedulerService.start(settings);
    setIsActive(true);
  };

  const handleStopScheduler = () => {
    schedulerService.stop();
    setIsActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">GitHub Commit Streak Booster</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <RepositoryConfig 
              onSave={handleSaveConfig} 
              isConfigured={isConfigured} 
              loading={configuring} 
            />
            
            <CommitStats 
              isActive={isActive}
              stats={stats}
            />

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important Note</AlertTitle>
              <AlertDescription>
                For the scheduler to work properly, this page must remain open in your browser.
                For continuous operation, consider deploying this app to a 24/7 service.
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="space-y-6">
            <CommitScheduler
              onStart={handleStartScheduler}
              onStop={handleStopScheduler}
              isActive={isActive}
              isConfigured={isConfigured}
              stats={{
                totalCommits: stats.totalCommits,
                streakDays: stats.streakDays,
                lastCommitDate: stats.lastCommitDate
              }}
            />
            
            <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">How It Works</h3>
              <div className="space-y-3">
                <p className="text-sm">
                  <span className="font-medium">1. Configure Repository:</span> Enter your GitHub repository details and access token.
                </p>
                <p className="text-sm">
                  <span className="font-medium">2. Set Schedule:</span> Choose how many commits per day and when they should occur.
                </p>
                <p className="text-sm">
                  <span className="font-medium">3. Start Scheduler:</span> The app will automatically create commits to your repository according to your settings.
                </p>
                <p className="text-sm">
                  <span className="font-medium">4. Keep Green:</span> Watch your GitHub contribution graph fill with activity!
                </p>
              </div>
              
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  asChild
                >
                  <a 
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Commit%20Streak%20Booster" 
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    Generate GitHub Token
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
