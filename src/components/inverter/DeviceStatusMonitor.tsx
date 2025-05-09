
import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatWestAfricaTime, timeAgo } from "@/utils/westAfricaTime";
import { subscribeToDeviceData } from "@/integrations/firebase/client";
import { getInverterLastSeen } from "@/utils/dataLogging";
import { toast } from "@/hooks/use-toast";

interface DeviceStatusMonitorProps {
  inverterId: string;
  deviceData?: string;
  refreshInterval?: number;
}

export const DeviceStatusMonitor = ({
  inverterId,
  deviceData,
  refreshInterval = 5000,
}: DeviceStatusMonitorProps) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastDbUpdateTime, setLastDbUpdateTime] = useState<string | null>(null);
  const [systemId, setSystemId] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(Date.now());
  const inverterIdRef = useRef<string>(inverterId);
  
  // The threshold in milliseconds for considering a device offline (15 seconds)
  const OFFLINE_THRESHOLD = 15000;
  
  // Reset state when inverterId changes
  useEffect(() => {
    if (inverterIdRef.current !== inverterId) {
      inverterIdRef.current = inverterId;
      setIsOnline(false);
      setLastDbUpdateTime(null);
      setSystemId(null);
    }
  }, [inverterId]);

  // Get the system_id for this inverter when component mounts or inverterId changes
  useEffect(() => {
    console.log(`DeviceStatusMonitor initialized for inverter ID: ${inverterId}`);
    
    const getDeviceInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('inverter_systems')
          .select('system_id, last_seen')
          .eq('id', inverterId)
          .single();
          
        if (error) throw error;
        
        if (data && data.system_id) {
          setSystemId(data.system_id);
          console.log(`Inverter ${inverterId} has system_id: ${data.system_id} - Setting up device monitoring`);
          
          // Set the last update time from database if available
          if (data.last_seen) {
            setLastDbUpdateTime(data.last_seen);
            
            // Check if the last_seen time is recent (within OFFLINE_THRESHOLD)
            const lastSeenDate = new Date(data.last_seen).getTime();
            const now = Date.now();
            if (now - lastSeenDate < OFFLINE_THRESHOLD) {
              setIsOnline(true);
            } else {
              setIsOnline(false);
            }
          }
        }
      } catch (error) {
        console.error(`Error getting device info for inverter ${inverterId}:`, error);
      }
    };
    
    if (inverterId) {
      getDeviceInfo();
    }
  }, [inverterId]);

  // Fetch the last seen time from the database periodically
  useEffect(() => {
    if (!inverterId) return;
    
    console.log(`Setting up last seen polling for inverter ${inverterId} with interval ${refreshInterval}ms`);
    
    const fetchLastSeen = async () => {
      try {
        if (inverterIdRef.current !== inverterId) return;
        
        lastFetchTimeRef.current = Date.now();
        
        // Directly query the database for the most up-to-date last_seen timestamp
        const { data, error } = await supabase
          .from('inverter_systems')
          .select('last_seen')
          .eq('id', inverterId)
          .single();
          
        if (error) throw error;
        
        if (data && data.last_seen) {
          console.log(`Fetched last seen for inverter ${inverterId}: ${data.last_seen}`);
          setLastDbUpdateTime(data.last_seen);
          
          // Check if this timestamp is recent enough to consider online
          const lastSeenTime = new Date(data.last_seen).getTime();
          const now = Date.now();
          
          if (now - lastSeenTime < OFFLINE_THRESHOLD) {
            if (!isOnline) {
              console.log(`Setting inverter ${inverterId} online based on recent last_seen (${data.last_seen})`);
              setIsOnline(true);
            }
          } else {
            // If it was online but now should be offline, update state
            if (isOnline) {
              console.log(`Setting inverter ${inverterId} offline - last_seen too old (${data.last_seen}), ${now - lastSeenTime}ms > ${OFFLINE_THRESHOLD}ms`);
              setIsOnline(false);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching last seen for inverter ${inverterId}:`, error);
      }
    };
    
    // Fetch initially
    fetchLastSeen();
    
    // Set up interval to fetch periodically
    const interval = setInterval(fetchLastSeen, refreshInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [inverterId, refreshInterval, isOnline]);

  // Subscribe to Firebase updates to detect device activity
  useEffect(() => {
    if (!systemId || inverterIdRef.current !== inverterId) return;
    
    console.log(`Setting up Firebase subscription for system ID: ${systemId} (inverter: ${inverterId})`);
    
    // Subscribe to Firebase data updates
    const unsubscribe = subscribeToDeviceData(systemId, () => {
      // We no longer update last_seen directly from client-side
      // We only rely on the Supabase edge function for last_seen updates
      console.log(`Received Firebase data update for system: ${systemId}, inverter: ${inverterId}`);
    });
    
    // Return cleanup function
    return () => {
      console.log(`Cleaning up Firebase subscription for inverter ${inverterId}`);
      unsubscribe();
    };
  }, [systemId, inverterId]);

  const getTimeAgo = () => {
    if (lastDbUpdateTime) {
      return timeAgo(new Date(lastDbUpdateTime).getTime());
    }
    return "";
  };

  return (
    <div className="flex items-center space-x-2">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-400">Online</span>
          {lastDbUpdateTime && (
            <span className="text-xs text-gray-400">
              • Last update: {getTimeAgo()}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-400">Offline</span>
          {lastDbUpdateTime && (
            <span className="text-xs text-gray-400">
              • Last seen: {getTimeAgo()}
            </span>
          )}
        </>
      )}
    </div>
  );
};
