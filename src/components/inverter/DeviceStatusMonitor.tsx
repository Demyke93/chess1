
import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatWestAfricaTime, timeAgo } from "@/utils/westAfricaTime";
import { subscribeToDeviceData } from "@/integrations/firebase/client";
import { logInverterData, getInverterLastSeen } from "@/utils/dataLogging";
import { toast } from "@/hooks/use-toast";

interface DeviceStatusMonitorProps {
  inverterId: string;
  deviceData?: string;
  refreshInterval?: number;
}

export const DeviceStatusMonitor = ({
  inverterId,
  deviceData,
  refreshInterval = 5000, // Extended to 5 seconds for more reliable status
}: DeviceStatusMonitorProps) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastDbUpdateTime, setLastDbUpdateTime] = useState<string | null>(null);
  const lastRandomValueRef = useRef<number>(0);
  const [systemId, setSystemId] = useState<string | null>(null);
  const initialLoadRef = useRef<boolean>(true);
  const hasRandomValueChangedRef = useRef<boolean>(false);
  const ignoredFirstUpdateRef = useRef<boolean>(false);
  const lastSystemIdRef = useRef<string | null>(null);
  const inverterIdRef = useRef<string>(inverterId);
  const lastFetchTimeRef = useRef<number>(Date.now());
  const offlineStateTimerRef = useRef<number | null>(null);
  const stateChangeDebounceTimerRef = useRef<number | null>(null);
  const lastStatusChangeTimeRef = useRef<number>(Date.now());
  const statusStabilityCountRef = useRef<number>(0);
  const pendingFirebaseUpdateRef = useRef<boolean>(false);
  
  // Key for supabase channel - make it dependent on inverterId to ensure unique channels
  const channelIdRef = useRef<string>(`device_${inverterId}_${Math.random().toString(36).substring(7)}`);

  // Reset all state when inverterId changes
  useEffect(() => {
    // Reset everything when inverterId changes
    if (inverterIdRef.current !== inverterId) {
      console.log(`DeviceStatusMonitor: inverterId changed from ${inverterIdRef.current} to ${inverterId}, resetting state`);
      inverterIdRef.current = inverterId;
      setIsOnline(false);
      setLastDbUpdateTime(null);
      setSystemId(null);
      lastRandomValueRef.current = 0;
      initialLoadRef.current = true;
      hasRandomValueChangedRef.current = false;
      ignoredFirstUpdateRef.current = false;
      lastSystemIdRef.current = null;
      lastStatusChangeTimeRef.current = Date.now();
      statusStabilityCountRef.current = 0;
      pendingFirebaseUpdateRef.current = false;
      
      // Clear any existing timers
      if (offlineStateTimerRef.current) {
        window.clearTimeout(offlineStateTimerRef.current);
        offlineStateTimerRef.current = null;
      }
      
      if (stateChangeDebounceTimerRef.current) {
        window.clearTimeout(stateChangeDebounceTimerRef.current);
        stateChangeDebounceTimerRef.current = null;
      }
      
      channelIdRef.current = `device_${inverterId}_${Math.random().toString(36).substring(7)}`;
    }
  }, [inverterId]);

  // First, get the system_id for this inverter when component mounts or inverterId changes
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
          // Reset our flags when system ID changes
          if (lastSystemIdRef.current !== data.system_id) {
            console.log(`System ID changed from ${lastSystemIdRef.current} to ${data.system_id}, resetting online detection for inverter ${inverterId}`);
            lastSystemIdRef.current = data.system_id;
            ignoredFirstUpdateRef.current = false;
            setIsOnline(false);
            hasRandomValueChangedRef.current = false;
            initialLoadRef.current = true;
            pendingFirebaseUpdateRef.current = false;
            
            // Set the last update time from database if available
            if (data.last_seen) {
              const lastSeenDate = new Date(data.last_seen).getTime();
              setLastDbUpdateTime(data.last_seen);
              
              // If last_seen is recent (within the past 3 minutes), consider the device online
              const threeMinutesAgo = Date.now() - 180000;
              if (lastSeenDate > threeMinutesAgo) {
                setIsOnline(true);
                initialLoadRef.current = false;
              } else {
                // If last seen is more than three minutes ago, device should be offline
                setIsOnline(false);
              }
            }
          }
          
          setSystemId(data.system_id);
          console.log(`Inverter ${inverterId} has system_id: ${data.system_id} - Setting up device monitoring`);
          
          // Also fetch the last known random value from Supabase if we store it
          try {
            const { data: lastData, error: lastError } = await supabase
              .from('device_data')
              .select('data')
              .eq('device_id', data.system_id)
              .order('timestamp', { ascending: false })
              .limit(1);
              
            if (!lastError && lastData && lastData.length > 0 && lastData[0].data) {
              const values = lastData[0].data.split(',');
              if (values.length >= 21) {
                lastRandomValueRef.current = parseInt(values[20]) || 0;
                console.log(`Retrieved last known random value for inverter ${inverterId}: ${lastRandomValueRef.current}`);
              }
            }
          } catch (e) {
            console.error(`Error fetching last random value for inverter ${inverterId}:`, e);
          }
        }
      } catch (error) {
        console.error(`Error getting device info for inverter ${inverterId}:`, error);
      }
    };
    
    if (inverterId) {
      getDeviceInfo();
    }
    
    // When component unmounts or inverterId changes, reset state
    return () => {
      console.log(`DeviceStatusMonitor cleanup for inverter ${inverterId}`);
    };
  }, [inverterId]);

  // Fetch the last seen time from the database periodically for THIS specific inverter
  useEffect(() => {
    if (!inverterId) return;
    
    console.log(`Setting up last seen polling for inverter ${inverterId}`);
    
    const fetchLastSeen = async () => {
      // Only fetch if we're still mounted with the same inverterId
      if (inverterIdRef.current !== inverterId) return;
      
      // Record when we last attempted to fetch
      lastFetchTimeRef.current = Date.now();
      
      const lastSeen = await getInverterLastSeen(inverterId);
      console.log(`Fetched last seen for inverter ${inverterId}: ${lastSeen}`);
      
      if (lastSeen) {
        setLastDbUpdateTime(lastSeen);
        
        // Check if this timestamp is recent enough to consider online
        const lastSeenTime = new Date(lastSeen).getTime();
        const threeMinutesAgo = Date.now() - 180000; // 3 minutes threshold for offline
        
        if (lastSeenTime > threeMinutesAgo) {
          // Only update the status if we're currently offline or if it's been stable
          if (!isOnline || (Date.now() - lastStatusChangeTimeRef.current) > 30000) {
            console.log(`Setting inverter ${inverterId} online based on database last_seen timestamp (${lastSeen})`);
            setIsOnline(true);
            lastStatusChangeTimeRef.current = Date.now();
          }
        } else if (isOnline) {
          // If it was online but the timestamp is now old, schedule offline state change
          // Use a timer to debounce the state change
          if (!offlineStateTimerRef.current) {
            offlineStateTimerRef.current = window.setTimeout(() => {
              console.log(`Setting inverter ${inverterId} offline - last_seen timestamp too old (${lastSeen})`);
              setIsOnline(false);
              lastStatusChangeTimeRef.current = Date.now();
              statusStabilityCountRef.current = 0;
              offlineStateTimerRef.current = null;
            }, 10000); // Wait 10 seconds before confirming offline state
          }
        }
      }
    };
    
    // Fetch initially
    fetchLastSeen();
    
    // Set up interval to fetch periodically - even when logged out/signed out
    // No dependency on auth state means this will continue running
    const interval = setInterval(fetchLastSeen, 30000); // Check every 30 seconds
    
    return () => {
      console.log(`Cleaning up last seen polling for inverter ${inverterId}`);
      clearInterval(interval);
      
      // Clear any pending timers
      if (offlineStateTimerRef.current) {
        clearTimeout(offlineStateTimerRef.current);
      }
    };
  }, [inverterId, isOnline]);

  // Parse device data from a string when it changes
  useEffect(() => {
    if (!deviceData || !systemId || inverterIdRef.current !== inverterId) {
      return;
    }

    try {
      const values = deviceData.split(',');
      
      // The random value is at position 20 in the array (0-indexed)
      if (values.length >= 21) {
        const currentRandomValue = parseInt(values[20]) || 0;

        // Ignore the first update to prevent false positive
        if (!ignoredFirstUpdateRef.current) {
          ignoredFirstUpdateRef.current = true;
          console.log(`Ignoring first random value update for ${inverterId} to prevent false online status`);
          return;
        }

        if (currentRandomValue !== lastRandomValueRef.current) {
          console.log(`Random value changed from ${lastRandomValueRef.current} to ${currentRandomValue} for inverter ${inverterId}`);
          lastRandomValueRef.current = currentRandomValue;
          
          // Log data to Supabase if we have system_id
          if (systemId && values.length >= 21) {
            // Parse the data and log it
            const dataToLog = {
              power: parseFloat(values[2]) || 0, // Load/Power at index 2
              battery_percentage: parseFloat(values[15]) || 0,
              battery_voltage: parseFloat(values[10]) || 0,
              voltage: parseFloat(values[0]) || 0,
              current: parseFloat(values[1]) || 0,
              mains_present: values[6] === "1",
              solar_present: values[7] === "1",
              frequency: parseFloat(values[4]) || 0,
              power_factor: parseFloat(values[5]) || 0,
              energy: parseFloat(values[3]) || 0
            };
            
            logInverterData(systemId, dataToLog)
              .then(success => {
                if (success) console.log(`Successfully logged inverter data for ${inverterId} to Supabase`);
              })
              .catch(err => {
                console.error(`Failed to log inverter data for ${inverterId}:`, err);
              });
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing device data for ${inverterId}:`, error);
    }
  }, [deviceData, systemId, inverterId]);

  // Subscribe to Firebase device data changes
  useEffect(() => {
    if (!systemId || inverterIdRef.current !== inverterId) return;
    
    console.log(`Setting up Firebase subscription for system ID: ${systemId} (inverter: ${inverterId})`);
    
    // Set up Firebase subscription (without prefix) to monitor random value changes
    const unsubscribe = subscribeToDeviceData(systemId, (data) => {
      // Check if this callback is still valid for the current inverterId
      if (inverterIdRef.current !== inverterId) {
        console.log(`Ignoring Firebase update for old inverterId ${inverterIdRef.current}, current is ${inverterId}`);
        return;
      }

      // Log receipt of Firebase data for debugging
      console.log(`Received Firebase data update for system: ${systemId}, inverter: ${inverterId}`, data);
      
      if (data) {
        // Check for random value changes
        if (data.random_value !== undefined) {
          const currentRandomValue = data.random_value;
          
          // Ignore the first update to prevent false positive
          if (!ignoredFirstUpdateRef.current) {
            ignoredFirstUpdateRef.current = true;
            console.log(`Ignoring first Firebase update for ${inverterId} to prevent false online status`);
            return;
          }
          
          // IMPORTANT: This is where we detect random value changes from Firebase
          if (currentRandomValue !== lastRandomValueRef.current) {
            console.log(`Firebase: Random value changed from ${lastRandomValueRef.current} to ${currentRandomValue} for inverter ${inverterId}`);
            lastRandomValueRef.current = currentRandomValue;
            pendingFirebaseUpdateRef.current = true;
            
            // Log Firebase data to Supabase
            if (systemId && data) {
              logInverterData(systemId, {
                power: data.power || data.load || 0,
                battery_percentage: data.battery_percentage || 0,
                battery_voltage: data.battery_voltage || 0,
                voltage: data.voltage || 0,
                current: data.current || 0,
                mains_present: data.mains_present === true || data.mains_present === 1,
                solar_present: data.solar_present === true || data.solar_present === 1,
                frequency: data.frequency || 0,
                power_factor: data.power_factor || 0,
                energy: data.energy || 0
              })
                .then(success => {
                  if (success) console.log(`Successfully logged Firebase data for ${inverterId} to Supabase`);
                })
                .catch(err => {
                  console.error(`Failed to log Firebase data for ${inverterId}:`, err);
                });
            }
          }
        }
      }
    });
    
    // Create a unique channel name for each instance to avoid shared state
    const channelName = channelIdRef.current;
    
    // Use Supabase realtime subscription with a unique channel name per component
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_data',
          filter: `device_id=eq.${systemId}`
        },
        (payload) => {
          // Skip if this callback is no longer valid for the current inverterId
          if (inverterIdRef.current !== inverterId) {
            console.log(`Ignoring Supabase update for old inverterId ${inverterIdRef.current}, current is ${inverterId}`);
            return;
          }
          
          console.log(`Received data change for ${systemId} (inverter: ${inverterId}) on channel ${channelName}:`, payload);
        }
      )
      .subscribe((status) => {
        console.log(`Supabase subscription status for ${inverterId} on channel ${channelName}: ${status}`);
      });
    
    // Return cleanup function
    return () => {
      console.log(`Cleaning up subscriptions for inverter ${inverterId}`);
      unsubscribe();
      supabase.removeChannel(channel);
      
      // Clear any pending timers
      if (stateChangeDebounceTimerRef.current) {
        clearTimeout(stateChangeDebounceTimerRef.current);
        stateChangeDebounceTimerRef.current = null;
      }
      
      if (offlineStateTimerRef.current) {
        clearTimeout(offlineStateTimerRef.current);
        offlineStateTimerRef.current = null;
      }
    };
  }, [systemId, inverterId]);

  const getTimeAgo = () => {
    // Just use the database last_seen if available
    if (lastDbUpdateTime) {
      return timeAgo(new Date(lastDbUpdateTime).getTime());
    }
    return "";
  };

  // Check if there's a pending Firebase update that might not have been processed yet
  const hasPendingUpdate = pendingFirebaseUpdateRef.current;

  // Don't show online status until we've confirmed a random value change
  // or received a real update from the database, and have properly ignored the first update
  const showAsOnline = (isOnline || hasPendingUpdate) && 
                      (!initialLoadRef.current || hasRandomValueChangedRef.current) && 
                      ignoredFirstUpdateRef.current &&
                      inverterIdRef.current === inverterId; // Ensure we're showing status for current inverter

  return (
    <div className="flex items-center space-x-2">
      {showAsOnline ? (
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
