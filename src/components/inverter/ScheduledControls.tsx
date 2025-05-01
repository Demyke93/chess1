
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScheduleCountdown } from "@/hooks/useScheduleCountdown";
import { Button } from "@/components/ui/button";

// Fix the getServerTime issue by using a direct function
const getServerTime = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-current-time');
    if (error) throw error;
    return new Date(data.timestamp);
  } catch (error) {
    console.error('Error getting server time:', error);
    return new Date();
  }
};

interface ScheduledControlsProps {
  inverterId: string;
  onSchedule: (time: Date, action: string) => void;
  onCancel: () => void;
  scheduledAction: {
    time: Date;
    action: string;
  } | null;
}

export const ScheduledControls = ({
  inverterId,
  onSchedule,
  onCancel,
  scheduledAction,
}: ScheduledControlsProps) => {
  const [selectedTime, setSelectedTime] = useState<number>(30); // Default 30 minutes
  const [selectedAction, setSelectedAction] = useState<string>("power_off");
  const countdown = useScheduleCountdown(
    scheduledAction?.time,
    onCancel
  );

  // Extract timeRemaining and isActive from the return value of useScheduleCountdown
  const timeRemaining = countdown?.timeRemaining || "00:00:00";
  const isActive = countdown?.isActive || false;

  const handleSchedule = async () => {
    try {
      const serverTime = await getServerTime();
      const scheduledTime = new Date(
        serverTime.getTime() + selectedTime * 60 * 1000
      );
      onSchedule(scheduledTime, selectedAction);
    } catch (error) {
      console.error("Error scheduling action:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Scheduled Controls</h3>

      {isActive ? (
        <div className="p-4 bg-black/60 rounded-lg border border-orange-500/30">
          <p className="text-sm text-white mb-2">
            {scheduledAction?.action === "power_off"
              ? "Scheduled Shutdown"
              : "Scheduled Power On"}
          </p>
          <p className="text-2xl font-bold text-orange-500">{timeRemaining}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-red-500/50 text-red-500 hover:bg-red-500/20"
            onClick={onCancel}
          >
            Cancel Schedule
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-black/60 rounded-lg border border-orange-500/30 space-y-4">
          <div>
            <label className="text-sm text-gray-300 block mb-2">
              Schedule Action
            </label>
            <div className="flex space-x-2">
              <Button
                variant={selectedAction === "power_off" ? "default" : "outline"}
                size="sm"
                className={
                  selectedAction === "power_off"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                }
                onClick={() => setSelectedAction("power_off")}
              >
                Power Off
              </Button>
              <Button
                variant={selectedAction === "power_on" ? "default" : "outline"}
                size="sm"
                className={
                  selectedAction === "power_on"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                }
                onClick={() => setSelectedAction("power_on")}
              >
                Power On
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-2">
              Schedule Time
            </label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 60, 120].map((minutes) => (
                <Button
                  key={minutes}
                  variant={selectedTime === minutes ? "default" : "outline"}
                  size="sm"
                  className={
                    selectedTime === minutes
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                  }
                  onClick={() => setSelectedTime(minutes)}
                >
                  {minutes < 60
                    ? `${minutes}m`
                    : `${minutes / 60}h${minutes % 60 ? `${minutes % 60}m` : ""}`}
                </Button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={handleSchedule}
          >
            Schedule {selectedAction === "power_off" ? "Shutdown" : "Power On"}
          </Button>
        </div>
      )}
    </div>
  );
};
