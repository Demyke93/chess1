
// This edge function checks Firebase database for the latest activity timestamps and updates Supabase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyCaJJ-2ExS5uGcH7jQ_9jwbHFIKLrj8J54",
      databaseURL: "https://powerverter-pro-default-rtdb.firebaseio.com/",
    };
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    
    // Get all systems from Supabase
    const { data: systems, error: systemsError } = await supabase
      .from('inverter_systems')
      .select('id, system_id, last_seen')
      .order('last_seen', { ascending: true }) // Prioritize those with oldest last_seen timestamps
      .limit(50); // Process in batches to avoid timeout
    
    if (systemsError) {
      throw new Error(`Failed to fetch systems: ${systemsError.message}`);
    }
    
    console.log(`Processing ${systems.length} systems`);
    
    const updates = [];
    const results = { updated: 0, unchanged: 0, errors: 0, details: [] };
    
    for (const system of systems) {
      try {
        if (!system.system_id) {
          results.details.push({ id: system.id, status: "skipped", reason: "No system_id" });
          continue;
        }
        
        // Check both device data path and control state path
        const devicePath = `/${system.system_id}`;
        const controlPath = `/_${system.system_id}`;
        
        // First try control path (with underscore)
        const controlRef = ref(database, controlPath);
        const controlSnapshot = await get(controlRef);
        const controlData = controlSnapshot.val();
        
        // Then try device path (without underscore)
        const deviceRef = ref(database, devicePath);
        const deviceSnapshot = await get(deviceRef);
        const deviceData = deviceSnapshot.val();
        
        // Find latest timestamp between the two
        let lastUpdateTime = null;
        let updateSource = null;
        
        if (controlData && controlData.lastUpdate) {
          lastUpdateTime = new Date(controlData.lastUpdate);
          updateSource = "control";
        }
        
        if (deviceData && deviceData.timestamp) {
          const deviceTimestamp = new Date(deviceData.timestamp);
          if (!lastUpdateTime || deviceTimestamp > lastUpdateTime) {
            lastUpdateTime = deviceTimestamp;
            updateSource = "device";
          }
        }
        
        // If we found a timestamp and it's newer than the current last_seen
        if (lastUpdateTime) {
          const existingLastSeen = system.last_seen ? new Date(system.last_seen) : null;
          
          if (!existingLastSeen || lastUpdateTime > existingLastSeen) {
            // Update the last_seen value in Supabase
            const { error: updateError } = await supabase
              .from('inverter_systems')
              .update({ last_seen: lastUpdateTime.toISOString() })
              .eq('id', system.id);
            
            if (updateError) {
              throw new Error(`Failed to update system ${system.id}: ${updateError.message}`);
            }
            
            results.updated++;
            results.details.push({
              id: system.id, 
              system_id: system.system_id,
              status: "updated", 
              from: existingLastSeen?.toISOString() || "null",
              to: lastUpdateTime.toISOString(),
              source: updateSource
            });
          } else {
            results.unchanged++;
            results.details.push({ 
              id: system.id, 
              status: "unchanged", 
              reason: "Firebase timestamp not newer"
            });
          }
        } else {
          results.unchanged++;
          results.details.push({ 
            id: system.id, 
            status: "unchanged", 
            reason: "No timestamp found in Firebase"
          });
        }
      } catch (error) {
        console.error(`Error processing system ${system.id}:`, error);
        results.errors++;
        results.details.push({ 
          id: system.id, 
          status: "error", 
          error: error.message 
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
