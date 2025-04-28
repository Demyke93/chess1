import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { userService } from "@/services/userService";
import { useEffect } from "react";
import { calculateFee, calculateTotalWithFee } from "@/utils/feeCalculations";

const timeControls = [
  { value: "1", label: "1 min (Bullet)" },
  { value: "3", label: "3 min (Blitz)" },
  { value: "5", label: "5 min (Blitz)" },
  { value: "10", label: "10 min (Rapid)" },
  { value: "15", label: "15 min (Rapid)" },
  { value: "30", label: "30 min (Classical)" },
];

const stakeAmounts = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

const CreateMatchPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stake, setStake] = useState<number>(10);
  const [timeControl, setTimeControl] = useState<string>("5");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleCreateMatch = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a match",
        variant: "destructive",
      });
      return;
    }

    const totalStake = calculateTotalWithFee(stake);
    if (totalStake > user.balance) {
      toast({
        title: "Insufficient balance",
        description: `You need ${totalStake} coins (${stake} stake + ${calculateFee(stake)} fee) to create this match`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      await userService.createMatch({
        whitePlayerId: user.id,
        blackPlayerId: "", // Will be filled when someone joins
        whiteUsername: user.username,
        blackUsername: "", // Will be filled when someone joins
        stake,
        fee_amount: calculateFee(stake),
        status: "pending",
        timeControl,
        gameMode: "standard", // Default to standard chess
      });

      toast({
        title: "Match created",
        description: "Your match has been created successfully",
      });

      navigate(`/matches`);
    } catch (error) {
      console.error("Failed to create match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl">Create a Match</CardTitle>
          <CardDescription>
            Set up a new chess match with stakes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="stake">Stake Amount</Label>
              <div className="text-right">
                <span className="text-chess-accent font-mono">{stake} coins</span>
                <div className="text-xs text-gray-400">
                  (+{calculateFee(stake)} coins fee)
                </div>
              </div>
            </div>
            <Select value={stake.toString()} onValueChange={(value) => setStake(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select stake amount" />
              </SelectTrigger>
              <SelectContent>
                {stakeAmounts.map((amount) => (
                  <SelectItem key={amount} value={amount.toString()}>
                    {amount} coins
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Your balance: <span className="text-chess-accent">{user?.balance} coins</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-control">Time Control</Label>
            <Select value={timeControl} onValueChange={setTimeControl}>
              <SelectTrigger id="time-control">
                <SelectValue placeholder="Select time control" />
              </SelectTrigger>
              <SelectContent>
                {timeControls.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/matches")}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateMatch} 
            disabled={isCreating || stake > user.balance}
            className="bg-chess-accent hover:bg-chess-accent/80 text-black"
          >
            {isCreating ? "Creating..." : "Create Match"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateMatchPage;
