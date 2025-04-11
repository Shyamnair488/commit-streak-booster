
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar, Clock, Play, Square } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CommitSchedulerProps {
  onStart: (settings: CommitSettings) => void;
  onStop: () => void;
  isActive: boolean;
  isConfigured: boolean;
  stats: CommitStats;
}

export interface CommitSettings {
  commitsPerDay: number;
  startTime: string;
  endTime: string;
  commitMessage: string;
  randomizeCommits: boolean;
  daysOfWeek: string[];
}

export interface CommitStats {
  totalCommits: number;
  streakDays: number;
  lastCommitDate: string | null;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CommitScheduler = ({ onStart, onStop, isActive, isConfigured, stats }: CommitSchedulerProps) => {
  const [commitsPerDay, setCommitsPerDay] = useState(20);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [commitMessage, setCommitMessage] = useState("Update documentation");
  const [randomizeCommits, setRandomizeCommits] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS_OF_WEEK);

  const handleStart = () => {
    onStart({
      commitsPerDay,
      startTime,
      endTime,
      commitMessage,
      randomizeCommits,
      daysOfWeek: selectedDays,
    });
  };

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Commit Scheduler
        </CardTitle>
        <CardDescription>
          Configure your automatic commit schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label>Commits per day: {commitsPerDay}</Label>
            </div>
            <Slider
              value={[commitsPerDay]}
              min={1}
              max={100}
              step={1}
              onValueChange={(values) => setCommitsPerDay(values[0])}
              disabled={isActive || !isConfigured}
              className="py-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isActive || !isConfigured}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isActive || !isConfigured}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commit-message">Default Commit Message</Label>
            <Input
              id="commit-message"
              placeholder="Update documentation"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isActive || !isConfigured}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="randomize">Randomize commit times</Label>
            <Switch
              id="randomize"
              checked={randomizeCommits}
              onCheckedChange={setRandomizeCommits}
              disabled={isActive || !isConfigured}
            />
          </div>

          <div className="space-y-2">
            <Label>Active Days</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  className={selectedDays.includes(day) ? "bg-github-green hover:bg-github-darkgreen" : ""}
                  onClick={() => handleDayToggle(day)}
                  disabled={isActive || !isConfigured}
                  size="sm"
                >
                  {day.substring(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm">
            <span className="font-medium">Total commits:</span> {stats.totalCommits}
          </div>
          <div className="text-sm">
            <span className="font-medium">Current streak:</span> {stats.streakDays} days
          </div>
          {stats.lastCommitDate && (
            <div className="text-sm">
              <span className="font-medium">Last commit:</span> {new Date(stats.lastCommitDate).toLocaleString()}
            </div>
          )}
        </div>
        <Button 
          onClick={isActive ? onStop : handleStart}
          className={isActive ? "bg-destructive hover:bg-destructive/90" : "bg-github-green hover:bg-github-darkgreen"}
          disabled={!isConfigured}
          size="lg"
        >
          {isActive ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Stop Scheduler
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Scheduler
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CommitScheduler;
