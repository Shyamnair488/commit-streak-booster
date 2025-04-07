
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
    // Load config from localStorage
    this.getConfig();
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
      console.log("Testing repository access with config:", {
        repoUrl: config.repoUrl,
        username: config.username,
        email: config.email,
        token: "********" // Hiding token for security
      });
      
      // Validate repository access by making a test API call
      const repoInfo = await this.fetchRepoInfo(config);
      
      if (repoInfo) {
        console.log("Repository configured successfully:", repoInfo.name);
        this.config = config;
        localStorage.setItem('repoConfig', JSON.stringify(config));
        
        toast.success("Repository configured successfully", {
          description: `Connected to ${repoInfo.name}`
        });
        
        return true;
      }
      
      toast.error("Failed to access repository", {
        description: "Check your repository URL and token permissions"
      });
      
      return false;
    } catch (error) {
      console.error("Error validating repository:", error);
      
      toast.error("Error connecting to GitHub", {
        description: "Please check your credentials and try again"
      });
      
      return false;
    }
  }

  // Get repository information to validate access
  async fetchRepoInfo(config: RepositoryConfigData) {
    const { repoUrl, token } = config;
    const repoPath = this.extractRepoPath(repoUrl);
    
    if (!repoPath) {
      console.error("Invalid repository URL format");
      return null;
    }
    
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
      
      console.error("Failed to fetch repo info:", response.status, await response.text());
      return null;
    } catch (error) {
      console.error("Network error fetching repo info:", error);
      return null;
    }
  }

  // Extract username/repo from GitHub URL
  private extractRepoPath(repoUrl: string): string | null {
    try {
      // Handle URLs with or without .git extension
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(\.git)?$/);
      if (match) {
        const username = match[1];
        let repo = match[2];
        // Remove .git extension if present
        if (repo.endsWith('.git')) {
          repo = repo.substring(0, repo.length - 4);
        }
        return `${username}/${repo}`;
      }
      return null;
    } catch (e) {
      console.error("Error parsing repo URL:", e);
      return null;
    }
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
      toast.error("Repository not configured", {
        description: "Please configure your repository before making commits"
      });
      return false;
    }

    try {
      console.log("Attempting to create commit with message:", message);
      
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
      toast.error("Error making commit", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      return false;
    }
  }

  // Create an actual commit to GitHub
  private async createGitHubCommit(message: string): Promise<boolean> {
    if (!this.config) return false;
    
    const { repoUrl, token, username, email } = this.config;
    const repoPath = this.extractRepoPath(repoUrl);
    
    if (!repoPath) {
      console.error("Invalid repository URL format");
      return false;
    }
    
    try {
      console.log("Getting default branch...");
      
      // First try to get branches to determine the default branch
      const branchesResponse = await fetch(`https://api.github.com/repos/${repoPath}/branches`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!branchesResponse.ok) {
        console.error("Failed to fetch branches:", branchesResponse.status);
        toast.error("Failed to access repository branches", {
          description: "Please check your token has correct permissions"
        });
        return false;
      }
      
      const branches = await branchesResponse.json();
      
      // First try main, then master, then use the first branch in the list
      let defaultBranch = branches.find((b: any) => b.name === 'main');
      if (!defaultBranch) {
        defaultBranch = branches.find((b: any) => b.name === 'master');
      }
      
      if (!defaultBranch && branches.length > 0) {
        defaultBranch = branches[0];
      }
      
      if (!defaultBranch) {
        console.error("No branches found in repository");
        toast.error("Repository has no branches", {
          description: "Please initialize your repository with at least one commit"
        });
        return false;
      }
      
      const branchName = defaultBranch.name;
      console.log("Using branch:", branchName);
      
      // Get the reference to the branch
      const refResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/refs/heads/${branchName}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!refResponse.ok) {
        console.error("Failed to get reference:", refResponse.status);
        return false;
      }
      
      const refData = await refResponse.json();
      const latestCommitSha = refData.object.sha;
      
      // Get the commit data
      const commitResponse = await fetch(`https://api.github.com/repos/${repoPath}/git/commits/${latestCommitSha}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!commitResponse.ok) {
        console.error("Error fetching commit data:", commitResponse.status);
        return false;
      }
      
      const commitData = await commitResponse.json();
      
      // Create a new tree with a small change
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
        console.error("Error creating tree:", treeResponse.status);
        return false;
      }
      
      const treeData = await treeResponse.json();
      
      // Create a new commit
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
        console.error("Error creating commit:", newCommitResponse.status);
        const errorText = await newCommitResponse.text();
        console.error("Response:", errorText);
        return false;
      }
      
      const newCommitData = await newCommitResponse.json();
      
      // Update the reference to point to the new commit
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
        console.error("Error updating reference:", updateRefResponse.status);
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
