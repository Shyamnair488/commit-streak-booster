
import { GitBranch } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-github-green" />
          <h1 className="text-xl font-semibold">CommitBoost</h1>
        </div>
        <div className="text-sm text-gray-500">
          Keep your contribution graph green
        </div>
      </div>
    </header>
  );
};

export default Header;
