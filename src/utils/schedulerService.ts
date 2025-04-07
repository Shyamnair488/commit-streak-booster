
import { CommitSettings } from "@/components/CommitScheduler";
import { githubService } from "./githubService";
import { toast } from "sonner";

const COMMIT_MESSAGES = [
  "Update documentation",
  "Fix typos",
  "Improve code comments",
  "Update dependencies",
  "Add test cases",
  "Refactor code structure",
  "Optimize performance",
  "Update README",
  "Update configuration files",
  "Fix linting issues",
  "Add code examples",
  "Update changelog",
  "Organize files",
  "Remove unused code",
  "Update version number"
];

class SchedulerService {
  private settings: CommitSettings | null = null;
  private active: boolean = false;
  private commitTimers: NodeJS.Timeout[] = [];

  isActive(): boolean {
    return this.active;
  }

  start(settings: CommitSettings): void {
    if (this.active) {
      this.stop();
    }

    this.settings = settings;
    this.active = true;
    localStorage.setItem('schedulerActive', 'true');
    localStorage.setItem('commitSettings', JSON.stringify(settings));

    console.log("Scheduler started with settings:", settings);
    
    // Schedule today's commits
    this.scheduleCommits();
    
    // Schedule commit check for the next day
    this.scheduleNextDayCheck();
    
    toast.success("Commit scheduler started", {
      description: `Scheduling ${settings.commitsPerDay} commits per day`
    });
  }

  stop(): void {
    this.active = false;
    localStorage.setItem('schedulerActive', 'false');
    
    // Clear all scheduled commits
    this.commitTimers.forEach(timer => clearTimeout(timer));
    this.commitTimers = [];
    
    console.log("Scheduler stopped");
    toast.info("Commit scheduler stopped");
  }

  private scheduleCommits(): void {
    if (!this.active || !this.settings) return;

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if today is in the selected days
    if (!this.settings.daysOfWeek.includes(dayName)) {
      console.log(`No commits scheduled for ${dayName}`);
      return;
    }
    
    // Parse time ranges
    const [startHour, startMinute] = this.settings.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.settings.endTime.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // If current time is after end time, don't schedule any commits for today
    if (now > endTime) {
      console.log("Current time is after end time, no commits scheduled for today");
      return;
    }
    
    // If current time is before start time, adjust first commit time
    const actualStartTime = now > startTime ? now : startTime;
    
    // Calculate time range in milliseconds
    const timeRangeMs = endTime.getTime() - actualStartTime.getTime();
    
    // If no valid time range, exit
    if (timeRangeMs <= 0) {
      console.log("No valid time range for today");
      return;
    }
    
    // Schedule each commit
    const commitsToSchedule = this.settings.commitsPerDay;
    
    for (let i = 0; i < commitsToSchedule; i++) {
      let commitTime: Date;
      
      if (this.settings.randomizeCommits) {
        // Random time within the range
        const randomOffset = Math.floor(Math.random() * timeRangeMs);
        commitTime = new Date(actualStartTime.getTime() + randomOffset);
      } else {
        // Evenly distributed times
        const interval = timeRangeMs / commitsToSchedule;
        commitTime = new Date(actualStartTime.getTime() + (interval * i));
      }
      
      // Schedule the commit
      const delay = commitTime.getTime() - now.getTime();
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          this.createCommit();
        }, delay);
        
        this.commitTimers.push(timer);
        
        console.log(`Commit #${i + 1} scheduled for ${commitTime.toLocaleTimeString()}`);
      }
    }
    
    console.log(`${this.commitTimers.length} commits scheduled for today`);
  }

  private scheduleNextDayCheck(): void {
    // Calculate time to midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 12:01 AM
    
    const delay = tomorrow.getTime() - now.getTime();
    
    // Schedule check for tomorrow
    setTimeout(() => {
      if (this.active) {
        console.log("New day started, scheduling commits");
        this.scheduleCommits();
        this.scheduleNextDayCheck();
      }
    }, delay);
    
    console.log(`Next day check scheduled for ${tomorrow.toLocaleString()}`);
  }

  private async createCommit(): Promise<void> {
    if (!this.active || !this.settings) return;
    
    try {
      // Choose commit message
      let message = this.settings.commitMessage;
      
      // Use random message if enabled
      if (this.settings.randomizeCommits) {
        const randomMessages = COMMIT_MESSAGES.filter(m => m !== this.settings?.commitMessage);
        const randomIndex = Math.floor(Math.random() * randomMessages.length);
        message = randomMessages[randomIndex];
      }
      
      // Add timestamp to make each commit unique
      const timestamp = new Date().toISOString();
      const uniqueMessage = `${message} [${timestamp}]`;
      
      // Create commit
      const success = await githubService.makeCommit(uniqueMessage);
      
      if (success) {
        console.log(`Commit created: "${uniqueMessage}"`);
        toast.success("Commit created", {
          description: uniqueMessage
        });
      } else {
        console.error("Failed to create commit");
        toast.error("Failed to create commit", {
          description: "Check your repository configuration"
        });
      }
    } catch (error) {
      console.error("Error creating commit:", error);
      toast.error("Error creating commit");
    }
  }

  restoreState(): void {
    const active = localStorage.getItem('schedulerActive') === 'true';
    const savedSettings = localStorage.getItem('commitSettings');
    
    if (active && savedSettings) {
      try {
        const settings = JSON.parse(savedSettings) as CommitSettings;
        this.start(settings);
      } catch (e) {
        console.error("Failed to restore scheduler state:", e);
      }
    }
  }
}

export const schedulerService = new SchedulerService();
