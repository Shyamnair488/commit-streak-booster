import { toast } from "sonner";
import { CommitSettings } from "@/components/CommitScheduler";
import { RepositoryConfigData } from "@/components/RepositoryConfig";

export interface CommitStats {
  totalCommits: number;
  streakDays: number;
  lastCommitDate: string | null;
  daily: { date: string; count: number }[];
}

class GitHubService {
  private config: RepositoryConfigData | null = null;
  private stats: CommitStats = {
    totalCommits: 0,
    streakDays: 0,
    lastCommitDate: null,
    daily: []
  };

  constructor() {
    // Load stats from localStorage
    this.loadStats();
  }

  loadStats() {
    const savedStats = localStorage.getItem('commitStats');
    if (savedStats) {
      try {
        this.stats = JSON.parse(savedStats);
      } catch (e) {
        console.error("Failed to parse saved stats:", e);
      }
    }
  }

  saveStats() {
    localStorage.setItem('commitStats', JSON.stringify(this.stats));
  }

  getStats(): CommitStats {
    return this.stats;
  }

  async setConfig(config: RepositoryConfigData): Promise<boolean> {
    // In a real app, we would validate the repository access here
    // For now, we'll simulate a successful validation
    
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        console.log("Repository configured:", config);
        this.config = config;
        localStorage.setItem('repoConfig', JSON.stringify(config));
        resolve(true);
      }, 1500);
    });
  }

  getConfig(): RepositoryConfigData | null {
    if (this.config) return this.config;
    
    const savedConfig = localStorage.getItem('repoConfig');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
        return this.config;
      } catch (e) {
        console.error("Failed to parse saved config:", e);
      }
    }
    return null;
  }

  async makeCommit(message: string): Promise<boolean> {
    if (!this.config) {
      console.error("Repository not configured");
      return false;
    }

    // In a real app, we would make a real API call to GitHub here
    // For now, we'll simulate a successful commit
    
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        console.log(`Commit created: "${message}"`);
        
        // Update stats
        this.stats.totalCommits += 1;
        
        const today = new Date().toISOString();
        this.stats.lastCommitDate = today;
        
        // Check if we already have an entry for today
        const todayDate = today.split('T')[0];
        const todayIndex = this.stats.daily.findIndex(d => d.date.split('T')[0] === todayDate);
        
        if (todayIndex >= 0) {
          // Update today's count
          this.stats.daily[todayIndex].count += 1;
        } else {
          // Add a new entry for today
          this.stats.daily.push({
            date: today,
            count: 1
          });
          
          // Calculate streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayDate = yesterday.toISOString().split('T')[0];
          
          const hadYesterdayCommit = this.stats.daily.some(d => d.date.split('T')[0] === yesterdayDate);
          
          if (hadYesterdayCommit) {
            this.stats.streakDays += 1;
          } else {
            this.stats.streakDays = 1;
          }
        }
        
        // Keep only the last 30 days of data
        this.stats.daily = this.stats.daily
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 30);
        
        this.saveStats();
        resolve(true);
      }, 500);
    });
  }

  clearConfig(): void {
    this.config = null;
    localStorage.removeItem('repoConfig');
  }

  resetStats(): void {
    this.stats = {
      totalCommits: 0,
      streakDays: 0,
      lastCommitDate: null,
      daily: []
    };
    this.saveStats();
  }
}

export const githubService = new GitHubService();
