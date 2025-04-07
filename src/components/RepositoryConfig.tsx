
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Github } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RepositoryConfigProps {
  onSave: (config: RepositoryConfigData) => void;
  isConfigured: boolean;
  loading: boolean;
}

export interface RepositoryConfigData {
  repoUrl: string;
  username: string;
  token: string;
  email: string;
}

const RepositoryConfig = ({ onSave, isConfigured, loading }: RepositoryConfigProps) => {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  const handleSave = () => {
    if (!repoUrl || !username || !token || !email) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    // Basic validation for GitHub repository URL
    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    if (!githubUrlPattern.test(repoUrl)) {
      toast({
        title: "Invalid repository URL",
        description: "Please enter a valid GitHub repository URL",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    onSave({ repoUrl, username, token, email });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Repository Configuration
        </CardTitle>
        <CardDescription>
          Configure your GitHub repository for automatic commits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repo-url">Repository URL</Label>
          <Input
            id="repo-url"
            placeholder="https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={isConfigured || loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">GitHub Username</Label>
          <Input
            id="username"
            placeholder="Your GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isConfigured || loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token">Personal Access Token</Label>
          <Input
            id="token"
            type="password"
            placeholder="github_pat_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isConfigured || loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Create a token with repo scope at{" "}
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noreferrer"
              className="text-github-blue hover:underline"
            >
              GitHub Settings
            </a>
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Git Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isConfigured || loading}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConfigured ? (
          <div className="flex items-center text-sm text-green-600 gap-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Repository configured</span>
          </div>
        ) : (
          <div className="flex items-center text-sm text-amber-600 gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>Not configured</span>
          </div>
        )}
        <Button 
          onClick={handleSave} 
          className="bg-github-green hover:bg-github-darkgreen"
          disabled={isConfigured || loading}
        >
          {loading ? "Saving..." : isConfigured ? "Configured" : "Save Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RepositoryConfig;
