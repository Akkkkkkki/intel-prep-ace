import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Menu, 
  Home, 
  BarChart3, 
  Play, 
  User, 
  History,
  LogOut
} from "lucide-react";

interface NavigationProps {
  showHistory?: boolean;
}

const Navigation = ({ showHistory = false }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthContext();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const navigationItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/practice", label: "Practice", icon: Play },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const mockHistory = [
    { id: 1, company: "Google", role: "Software Engineer", date: "2024-01-15" },
    { id: 2, company: "Microsoft", role: "Senior Developer", date: "2024-01-10" },
    { id: 3, company: "Stripe", role: "Full Stack Engineer", date: "2024-01-05" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-primary">INT</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              {showHistory && (
                <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <div className="py-6">
                      <h2 className="text-lg font-semibold mb-4">Search History</h2>
                      <div className="space-y-3">
                        {mockHistory.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => {
                              navigate("/dashboard");
                              setIsHistoryOpen(false);
                            }}
                          >
                            <div className="font-medium">{item.company}</div>
                            <div className="text-sm text-muted-foreground">{item.role}</div>
                            <div className="text-xs text-muted-foreground mt-1">{item.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="py-6">
                  <div className="flex items-center gap-2 font-bold text-xl mb-6">
                    <Brain className="h-6 w-6 text-primary" />
                    <span className="text-primary">INT</span>
                  </div>
                  
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                          isActive(item.path)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {showHistory && (
                    <div className="mt-6">
                      <h3 className="font-medium mb-3">Recent Searches</h3>
                      <div className="space-y-2">
                        {mockHistory.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="p-2 border rounded cursor-pointer hover:bg-muted text-sm"
                            onClick={() => navigate("/dashboard")}
                          >
                            <div className="font-medium">{item.company}</div>
                            <div className="text-xs text-muted-foreground">{item.role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;