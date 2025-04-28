import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChessBoard } from "@/components/ChessBoard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { matchService } from "@/services/matchService";
import { Match } from "@/types";
import { 
  Loader2, ArrowLeft, ExternalLink, Flag, Share2, RefreshCw, Link2
} from "lucide-react";

const MatchPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLichessAuthenticated, connectToLichess } = useAuth();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingGame, setRefreshingGame] = useState(false);
  const [gameStatus, setGameStatus] = useState<'preparing' | 'playing' | 'completed'>('preparing');
  const [lichessGameId, setLichessGameId] = useState<string | null>(null);
  const [showLichessAuth, setShowLichessAuth] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [creatingOpenChallenge, setCreatingOpenChallenge] = useState(false);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [joinedMatch, setJoinedMatch] = useState(false);
  
  const fetchMatch = useCallback(async () => {
    if (!id) return;
    
    try {
      console.log(`Fetching match data for ID: ${id}`);
      setRefreshingGame(true);
      const fetchedMatch = await matchService.getMatch(id);
      
      if (fetchedMatch) {
        console.log(`Match data received:`, fetchedMatch);
        setMatch(fetchedMatch);
        
        if (fetchedMatch.lichessGameId) {
          console.log(`Match has Lichess game ID: ${fetchedMatch.lichessGameId}`);
          if (fetchedMatch.lichessGameId.includes('http')) {
            setChallengeUrl(fetchedMatch.lichessGameId);
            const extractedId = lichessApi.extractGameId(fetchedMatch.lichessGameId);
            if (extractedId) {
              setLichessGameId(extractedId);
            } else {
              setLichessGameId(fetchedMatch.lichessGameId);
            }
          } else {
            setLichessGameId(fetchedMatch.lichessGameId);
          }
          
          setGameStatus(fetchedMatch.status === 'completed' ? 'completed' : 'playing');
        }
        
        const bothPlayersPresent = fetchedMatch.whitePlayerId && fetchedMatch.blackPlayerId;
        if (bothPlayersPresent && fetchedMatch.status === 'pending') {
          console.log('Both players present but match still pending, updating to active');
          await matchService.updateMatchStatus(fetchedMatch.id, 'active');
          const updatedMatch = await matchService.refreshMatch(id);
          if (updatedMatch) setMatch(updatedMatch);
        }
      } else {
        console.error(`Match with ID ${id} not found`);
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Could not load match details",
        variant: "destructive"
      });
    } finally {
      setRefreshingGame(false);
      setLoading(false);
    }
  }, [id, toast]);

  const joinMatchIfNeeded = useCallback(async () => {
    if (!id || !user || !match || joinedMatch) return;
    
    const isPlayerInMatch = match.whitePlayerId === user.id || match.blackPlayerId === user.id;
    if (isPlayerInMatch) return;
    
    const canJoin = !match.whitePlayerId || !match.blackPlayerId;
    if (!canJoin) return;
    
    try {
      console.log(`Attempting to join match ${id} as user ${user.id} (${user.username})`);
      const joined = await matchService.joinMatch(id, user.id, user.username);
      if (joined) {
        console.log('Successfully joined match');
        setJoinedMatch(true);
        toast({
          title: "Joined Match",
          description: "You've successfully joined this match",
        });
        fetchMatch();
      }
    } catch (error) {
      console.error("Error joining match:", error);
    }
  }, [id, user, match, joinedMatch, toast, fetchMatch]);
  
  useEffect(() => {
    fetchMatch();
    
    const channel = supabase
      .channel('match-updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'matches', 
          filter: `id=eq.${id}` 
        }, 
        (payload) => {
          console.log("Match updated via realtime:", payload);
          fetchMatch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchMatch]);
  
  useEffect(() => {
    if (match && match.status === 'pending' && user && !joinedMatch) {
      joinMatchIfNeeded();
    }
  }, [match, user, joinMatchIfNeeded, joinedMatch]);
  
  const handleStartGame = async () => {
    if (!match || !user) return;
    
    try {
      setStartingGame(true);
      setRefreshingGame(true);
      
      if (!isLichessAuthenticated) {
        toast({
          title: "Lichess Connection Required",
          description: "You need to connect to Lichess before starting a game",
          variant: "default"
        });
        setShowLichessAuth(true);
        setRefreshingGame(false);
        setStartingGame(false);
        return;
      }
      
      const updatedMatch = await matchService.refreshMatch(match.id);
      if (!updatedMatch) {
        throw new Error("Could not refresh match data");
      }
      
      if (updatedMatch.lichessGameId) {
        setLichessGameId(updatedMatch.lichessGameId);
        setGameStatus('playing');
        setMatch(updatedMatch);
        setRefreshingGame(false);
        setStartingGame(false);
        return;
      }
      
      const opponent = user.id === updatedMatch.whitePlayerId 
        ? updatedMatch.blackUsername 
        : updatedMatch.whiteUsername;
      
      if (!opponent || opponent === 'Unknown') {
        toast({
          title: "Waiting for opponent",
          description: "You need to wait for an opponent to join before starting the game",
          variant: "default"
        });
        setRefreshingGame(false);
        setStartingGame(false);
        return;
      }
      
      console.log(`Creating challenge for opponent: ${opponent}`);
      const challengeId = await lichessApi.createChallenge(
        opponent,
        updatedMatch.timeControl,
        updatedMatch.stake > 0 ? 'rated' : 'casual'
      );
      
      if (!challengeId) {
        throw new Error("Failed to create Lichess challenge");
      }
      
      console.log(`Challenge created: ${challengeId}`);
      const updateSuccess = await matchService.updateLichessGameId(updatedMatch.id, challengeId);
      
      if (!updateSuccess) {
        throw new Error("Failed to update match with Lichess game ID");
      }
      
      setLichessGameId(challengeId);
      setGameStatus('playing');
      
      toast({
        title: "Game Started",
        description: "Your chess match has begun!",
      });
      
      setMatch({
        ...updatedMatch,
        lichessGameId: challengeId,
        status: 'active'
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: "Could not start the game. Please try again.",
        variant: "destructive"
      });
      setGameStatus('preparing');
    } finally {
      setRefreshingGame(false);
      setStartingGame(false);
    }
  };

  const handleCreateOpenChallenge = async () => {
    if (!match) return;
    
    try {
      setCreatingOpenChallenge(true);
      
      const { challengeId, challengeUrl } = await lichessApi.createOpenChallenge(
        match.timeControl,
        match.stake > 0 ? 'rated' : 'casual'
      );
      
      if (!challengeId || !challengeUrl) {
        throw new Error("Failed to create open challenge on Lichess");
      }
      
      console.log(`Open challenge created: ${challengeId}, URL: ${challengeUrl}`);
      const updateSuccess = await matchService.updateLichessGameId(match.id, challengeUrl);
      
      if (!updateSuccess) {
        throw new Error("Failed to update match with challenge URL");
      }
      
      setChallengeUrl(challengeUrl);
      setMatch({
        ...match,
        lichessGameId: challengeUrl,
        status: 'active'
      });
      
      toast({
        title: "Challenge Created",
        description: "Share the link with your opponent to start the game",
      });
    } catch (error) {
      console.error("Error creating open challenge:", error);
      toast({
        title: "Error",
        description: "Could not create challenge. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreatingOpenChallenge(false);
    }
  };

  const handleShareChallengeLink = () => {
    if (!challengeUrl) return;
    
    navigator.clipboard.writeText(challengeUrl)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Challenge link copied to clipboard",
        });
      })
      .catch(err => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Error",
          description: "Could not copy link. Please try manually copying it.",
          variant: "destructive"
        });
      });
  };

  const handleLichessAuth = async () => {
    try {
      await connectToLichess();
      setShowLichessAuth(false);
      
      setTimeout(() => {
        handleStartGame();
      }, 1000);
    } catch (error) {
      console.error("Error authenticating with Lichess:", error);
      toast({
        title: "Authentication Failed",
        description: "Could not connect to Lichess. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleGameLoad = () => {
    console.log("Game iframe loaded successfully");
  };
  
  const refreshGame = async () => {
    if (!id) return;
    
    setRefreshingGame(true);
    try {
      const refreshedMatch = await matchService.refreshMatch(id);
      if (refreshedMatch) {
        setMatch(refreshedMatch);
        
        if (refreshedMatch.lichessGameId && refreshedMatch.lichessGameId !== lichessGameId) {
          setLichessGameId(refreshedMatch.lichessGameId);
          
          if (refreshedMatch.lichessGameId.includes('http')) {
            setChallengeUrl(refreshedMatch.lichessGameId);
          }
          
          setGameStatus('playing');
        }
      }
    } catch (error) {
      console.error("Error refreshing match:", error);
      toast({
        title: "Error",
        description: "Could not refresh the match. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshingGame(false);
    }
  };
  
  const isUserInMatch = user && match && 
    (user.id === match.whitePlayerId || user.id === match.blackPlayerId);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-chess-accent" />
        <span className="ml-2 text-lg">Loading match...</span>
      </div>
    );
  }
  
  if (!match) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Match Not Found</h2>
        <p className="mb-8 text-gray-400">The match you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/matches")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Matches
        </Button>
      </div>
    );
  }
  
  const handleOpenInNewTab = () => {
    if (challengeUrl) {
      window.open(challengeUrl, '_blank', 'noopener,noreferrer');
      
      toast({
        title: "Lichess Match",
        description: "Opening match in a new tab",
      });
    } else if (lichessGameId) {
      const lichessUrl = lichessGameId.includes('http') 
        ? lichessGameId 
        : `https://lichess.org/${lichessGameId}`;
      
      window.open(lichessUrl, '_blank', 'noopener,noreferrer');
      
      toast({
        title: "Lichess Match",
        description: "Opening match in a new tab",
      });
    } else {
      toast({
        title: "No Match URL",
        description: "No Lichess match URL available yet",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Button 
        variant="outline" 
        onClick={() => navigate("/matches")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Matches
      </Button>
      
      <Card className="bg-chess-dark border-chess-brown/50">
        <CardHeader>
          <CardTitle className="text-2xl flex justify-between">
            <span>
              {match?.whiteUsername || 'Unknown'} vs {match?.blackUsername || 'Unknown'}
            </span>
            <span className="text-chess-accent">
              {match?.stake > 0 ? `${match.stake} coins` : 'Friendly Match'}
            </span>
          </CardTitle>
          
          {match && (
            <div className="flex space-x-2 text-sm text-gray-400">
              <span>{match.timeControl} min</span>
              <span>•</span>
              <span className="capitalize">{match.gameMode}</span>
              <span>•</span>
              <span className="capitalize">{match.status}</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {showLichessAuth ? (
              <div className="text-center space-y-4 w-full p-8 border border-chess-brown/50 rounded-md">
                <h3 className="text-xl font-semibold">Connect to Lichess</h3>
                <p className="text-gray-400 mb-4">
                  In a production app, you would connect to your real Lichess account using OAuth 2.0.
                  For this demo, we'll use a mock connection.
                </p>
                <Button onClick={handleLichessAuth} className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Connect to Lichess (Demo Mode)
                </Button>
              </div>
            ) : (challengeUrl && match?.status === 'active') ? (
              <div className="w-full space-y-4">
                <div className="bg-chess-brown/20 p-4 rounded-md text-center">
                  <h3 className="text-lg font-semibold mb-2">Challenge Created!</h3>
                  <p className="mb-4">Share this link with your opponent:</p>
                  <div className="flex items-center justify-center">
                    <input 
                      type="text"
                      value={challengeUrl}
                      readOnly
                      className="p-2 rounded-l-md bg-chess-dark border-chess-brown border text-sm w-full max-w-md"
                    />
                    <Button 
                      className="rounded-l-none" 
                      onClick={handleShareChallengeLink}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 flex justify-center space-x-4">
                    <Button 
                      onClick={handleOpenInNewTab}
                      className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                    >
                      Open Challenge <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {lichessGameId && (
                  <LichessEmbed 
                    gameId={lichessGameId} 
                    onLoad={handleGameLoad} 
                    onRetry={refreshGame}
                  />
                )}
              </div>
            ) : match?.status === 'active' && lichessGameId ? (
              <LichessEmbed gameId={lichessGameId} onLoad={handleGameLoad} onRetry={refreshGame} />
            ) : (
              <div className="w-full max-w-md">
                <ChessBoard />
              </div>
            )}
            
            {match.status === 'pending' && isUserInMatch && 
              match.blackPlayerId && match.whitePlayerId && (
              <div className="text-center space-y-4 w-full">
                <p className="text-gray-400">
                  Both players have joined. Start the game when you're ready.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button 
                    onClick={handleStartGame}
                    className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                    disabled={startingGame || refreshingGame || creatingOpenChallenge}
                  >
                    {startingGame ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting game...
                      </>
                    ) : (
                      <>
                        <Flag className="mr-2 h-4 w-4" />
                        Start Direct Game
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleCreateOpenChallenge}
                    variant="outline"
                    disabled={startingGame || refreshingGame || creatingOpenChallenge}
                  >
                    {creatingOpenChallenge ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating challenge...
                      </>
                    ) : (
                      <>
                        <Share2 className="mr-2 h-4 w-4" />
                        Create Open Challenge
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {match.status === 'pending' && (!match.blackPlayerId || !match.whitePlayerId) && isUserInMatch && (
              <div className="text-center space-y-4 w-full">
                <p className="text-gray-400">
                  Waiting for an opponent to join the match.
                </p>
              </div>
            )}
            
            {match.status === 'active' && lichessGameId && !challengeUrl && (
              <div className="text-center space-y-4 w-full">
                <p className="text-gray-400">
                  Your game is in progress on Lichess.
                </p>
                <div className="flex justify-center space-x-4">
                  <a 
                    href={`https://lichess.org/${lichessGameId}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                      Open Game in New Tab <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <Button 
                    variant="outline" 
                    onClick={refreshGame} 
                    disabled={refreshingGame}
                  >
                    {refreshingGame ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Game
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {match.status === 'completed' && (
              <div className="text-center p-4 border border-chess-brown/50 rounded-md w-full">
                <h3 className="text-lg font-bold mb-2">Result</h3>
                {match.winner ? (
                  <p>
                    Winner: <span className="font-semibold text-chess-win">
                      {match.winner === match.whitePlayerId ? match.whiteUsername : match.blackUsername}
                    </span>
                  </p>
                ) : (
                  <p>The match ended in a draw.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {(challengeUrl || lichessGameId) && (
        <Button 
          variant="outline" 
          onClick={handleOpenInNewTab}
          className="flex items-center"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Open in Lichess
        </Button>
      )}
    </div>
  );
};

export default MatchPage;
