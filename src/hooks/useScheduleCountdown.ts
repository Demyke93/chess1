
import { useState, useEffect } from "react";

interface CountdownReturn {
  timeRemaining: string;
  isActive: boolean;
}

export const useScheduleCountdown = (
  scheduledTime: Date | undefined | null,
  onComplete: () => void
): CountdownReturn => {
  const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00");
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    if (!scheduledTime) {
      setIsActive(false);
      return;
    }

    setIsActive(true);
    
    const calculateTimeLeft = () => {
      const difference = scheduledTime.getTime() - new Date().getTime();
      
      if (difference < 0) {
        setIsActive(false);
        onComplete();
        return "00:00:00";
      }
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      // Format with leading zeros
      const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
      
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    };
    
    // Set initial time
    setTimeRemaining(calculateTimeLeft());
    
    // Update every second
    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft();
      setTimeRemaining(timeLeft);
      
      if (timeLeft === "00:00:00") {
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [scheduledTime, onComplete]);
  
  return { timeRemaining, isActive };
};
