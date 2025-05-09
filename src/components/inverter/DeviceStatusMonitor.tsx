
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
  const offlineStatusTimerRef = useRef<number | null>(null);
  
  // The threshold in milliseconds for considering a device offline (15 seconds)
  const OFFLINE_THRESHOLD = 15000;
  
  // Reset state when inverterId changes
  useEffect(() => {
    if (inverterIdRef.current !== inverterId) {
      inverterIdRef.current = inverterId;
      setIsOnline(false);
      setLastDbUpdateTime(null);
      setSystemId(null);
      
      // Clear any existing timers
      if (offlineStatusTimerRef.current) {
        window.clearTimeout(offlineStatusTimerRef.current);
        offlineStatusTimerRef.current = null;
      }
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
    
    console.log(`Setting up last seen polling for inverter ${inverterId}`);
    
    const fetchLastSeen = async () => {
      if (inverterIdRef.current !== inverterId) return;
      
      lastFetchTimeRef.current = Date.now();
      
      const lastSeen = await getInverterLastSeen(inverterId);
      
      if (lastSeen) {
        console.log(`Fetched last seen for inverter ${inverterId}: ${lastSeen}`);
        setLastDbUpdateTime(lastSeen);
        
        // Check if this timestamp is recent enough to consider online
        const lastSeenTime = new Date(lastSeen).getTime();
        const now = Date.now();
        
        if (now - lastSeenTime < OFFLINE_THRESHOLD) {
          if (!isOnline) {
            console.log(`Setting inverter ${inverterId} online based on recent last_seen (${lastSeen})`);
            setIsOnline(true);
          }
        } else if (isOnline) {
          // If it was online but now should be offline, update state
          console.log(`Setting inverter ${inverterId} offline - last_seen too old (${lastSeen})`);
          setIsOnline(false);
        }
      }
    };
    
    // Fetch initially
    fetchLastSeen();
    
    // Set up interval to fetch periodically
    const interval = setInterval(fetchLastSeen, refreshInterval);
    
    return () => {
      clearInterval(interval);
      
      if (offlineStatusTimerRef.current) {
        clearTimeout(offlineStatusTimerRef.current);
      }
    };
  }, [inverterId, refreshInterval, isOnline]);

  // Subscribe to Firebase updates to detect device activity
  useEffect(() => {
    if (!systemId || inverterIdRef.current !== inverterId) return;
    
    console.log(`Setting up Firebase subscription for system ID: ${systemId} (inverter: ${inverterId})`);
    
    // Subscribe to Firebase data updates
    const unsubscribe = subscribeToDeviceData(systemId, (data) => {
      if (inverterIdRef.current !== inverterId) return;
      
      console.log(`Received Firebase data update for system: ${systemId}, inverter: ${inverterId}`);
      
      if (data) {
        // When we receive Firebase data, the device is definitely online
        // But we'll let the last_seen timestamp in the database be the source of truth
        // for consistency across clients
      }
    });
    
    // Return cleanup function
    return () => {
      console.log(`Cleaning up Firebase subscription for inverter ${inverterId}`);
      unsubscribe();
    };
  }, [systemId, inverterId]);

  // Effect to check last seen timestamp regularly and update online status
  useEffect(() => {
    if (!lastDbUpdateTime) return;
    
    const checkOnlineStatus = () => {
      const lastUpdateTime = new Date(lastDbUpdateTime).getTime();
      const currentTime = Date.now();
      const timeSinceUpdate = currentTime - lastUpdateTime;
      
      // If more than OFFLINE_THRESHOLD milliseconds have passed since the last update,
      // consider the device offline
      if (timeSinceUpdate > OFFLINE_THRESHOLD) {
        if (isOnline) {
          console.log(`Setting inverter ${inverterId} offline - no update in ${timeSinceUpdate}ms`);
          setIsOnline(false);
        }
      } else if (!isOnline) {
        console.log(`Setting inverter ${inverterId} online - recent update ${timeSinceUpdate}ms ago`);
        setIsOnline(true);
      }
    };
    
    // Check immediately
    checkOnlineStatus();
    
    // Set up interval to check regularly
    const interval = setInterval(checkOnlineStatus, 2000);
    
    return () => clearInterval(interval);
  }, [lastDbUpdateTime, isOnline, inverterId]);

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
