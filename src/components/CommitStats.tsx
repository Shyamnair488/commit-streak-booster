
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

interface CommitStatsProps {
  isActive: boolean;
  stats: {
    totalCommits: number;
    streakDays: number;
    lastCommitDate: string | null;
    daily: DailyCommit[];
  };
}

interface DailyCommit {
  date: string;
  count: number;
}

const CommitStats = ({ isActive, stats }: CommitStatsProps) => {
  // Get the last 7 days for visualization
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  // Map commit data to the last 7 days
  const commitData = last7Days.map(day => {
    const found = stats.daily.find(d => d.date.split('T')[0] === day);
    return {
      date: new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      count: found ? found.count : 0
    };
  });

  // Calculate the maximum count to scale the graph
  const maxCount = Math.max(...commitData.map(d => d.count), 5); // Minimum of 5 for visual purposes

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Commit Activity
        </CardTitle>
        <CardDescription>
          Your recent GitHub contribution activity
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-48 flex items-end justify-between gap-1">
          {commitData.map((day, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className={`w-full ${
                  day.count > 0 
                    ? "bg-github-green" 
                    : "bg-gray-100"
                } ${
                  isActive && index === commitData.length - 1 
                    ? "animate-pulse-green" 
                    : ""
                }`}
                style={{ 
                  height: `${(day.count / maxCount) * 100}%`,
                  minHeight: day.count > 0 ? "15%" : "5%" 
                }}
              ></div>
              <div className="text-xs mt-2 text-gray-600">
                {day.date.split(', ')[0]}
              </div>
              <div className="text-xs font-medium">
                {day.count}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommitStats;
