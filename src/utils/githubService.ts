
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
    try {
      // Validate repository access by making a test API call
      const repoInfo = await this.fetchRepoInfo(config);
      
      if (repoInfo) {
        console.log("Repository configured:", config);
        this.config = config;
        localStorage.setItem('repoConfig', JSON.stringify(config));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error validating repository:", error);
      return false;
    }
  }

  // Get repository information to validate access
  async fetchRepoInfo(config: RepositoryConfigData) {
    const { repoUrl, token } = config;
    const repoPath = this.extractRepoPath(repoUrl);
    
    if (!repoPath) return null;
    
    try {
      const response = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Error fetching repo info:", error);
      return null;
    }
  }

  // Extract username/repo from GitHub URL
  private extractRepoPath(repoUrl: string): string | null {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    return match ? `${match[1]}/${match[2]}` : null;
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

    try {
      // Make an actual commit to GitHub
      const success = await this.createGitHubCommit(message);
      
      if (success) {
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
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error making commit:", error);
      return false;
    }
  }

  // Create an actual commit to GitHub
  private async createGitHubCommit(message: string): Promise<boolean> {
    if (!this.config) return false;
    
    const { repoUrl, token, username, email } = this.config;
    const repoPath = this.extractRepoPath(repoUrl);
    
    if (!repoPath) return false;
    
    try {
      // 1. Get the reference to the master/main branch
      const branchResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/refs/heads/main`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      // If main branch doesn't exist, try master
      let branchData;
      if (!branchResponse.ok) {
        const masterResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/refs/heads/master`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (!masterResponse.ok) {
          console.error("Could not find main or master branch");
          return false;
        }
        branchData = await masterResponse.json();
      } else {
        branchData = await branchResponse.json();
      }

      // Extract branch name from ref
      const branchName = branchData.ref.split('/').pop();
      
      // 2. Get the latest commit SHA
      const latestCommitSha = branchData.object.sha;

      // 3. Get the commit data
      const commitResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/commits/${latestCommitSha}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!commitResponse.ok) {
        console.error("Error fetching commit data");
        return false;
      }
      
      const commitData = await commitResponse.json();
      
      // 4. Create a new tree with a small change
      const timestamp = new Date().toISOString();
      const newFileContent = `# CommitBoost Auto-Commit\n\nThis commit was automatically generated by CommitBoost.\nTimestamp: ${timestamp}\n\n${message}\n`;
      
      const treeResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/trees`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_tree: commitData.tree.sha,
          tree: [{
            path: `commits/commit-${Date.now()}.md`,
            mode: '100644',
            type: 'blob',
            content: newFileContent
          }]
        })
      });
      
      if (!treeResponse.ok) {
        console.error("Error creating tree");
        return false;
      }
      
      const treeData = await treeResponse.json();
      
      // 5. Create a new commit
      const newCommitResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/commits`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          tree: treeData.sha,
          parents: [latestCommitSha],
          author: {
            name: username,
            email: email,
            date: timestamp
          }
        })
      });
      
      if (!newCommitResponse.ok) {
        console.error("Error creating commit");
        return false;
      }
      
      const newCommitData = await newCommitResponse.json();
      
      // 6. Update the reference to point to the new commit
      const updateRefResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/refs/heads/${branchName}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false
        })
      });
      
      if (!updateRefResponse.ok) {
        console.error("Error updating reference");
        return false;
      }
      
      console.log(`Commit created successfully: "${message}"`);
      return true;
    } catch (error) {
      console.error("Error creating GitHub commit:", error);
      return false;
    }
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
