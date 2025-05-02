
import { InverterParameters } from "@/components/inverter/InverterParameters";
import { LoadControlPanel } from "@/components/inverter/LoadControlPanel";
import { PowerConsumptionChart } from "@/components/inverter/PowerConsumptionChart";
import { InverterDataDisplay } from "@/components/inverter/InverterDataDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface InverterSystemParameters {
  battery_percentage: number;
  battery_voltage: number;
  output_capacity: number;
  output_voltage: number;
  output_power: number;
  frequency: number;
  power_factor: number;
  mains_present: boolean;
  solar_present: boolean;
  energy_kwh: number;
  apparent_power: number;
  reactive_power: number;
  real_power: number;
  acv_rms: number;
  acv_peak_peak: number;
  acc_rms: number;
  acc_peak_peak: number;
  nominal_voltage?: number;
}

interface SystemTabsProps {
  parameters: InverterSystemParameters | null;
  showAdvanced: boolean;
  deviceData: string | null;
  inverterId: string;
  firebaseData: any;
}

export const SystemTabs = ({ 
  parameters, 
  showAdvanced, 
  deviceData, 
  inverterId,
  firebaseData 
}: SystemTabsProps) => {
  // Get device capacity from Firebase data in KVA
  const deviceCapacity = firebaseData?.device_capacity || parameters?.output_capacity || 0;
  
  // Calculate system capacity as 75% of device capacity (KVA to KW)
  const systemCapacity = deviceCapacity ? Math.round((parseFloat(deviceCapacity) * 0.75) * 100) / 100 : 0;
  
  const isMobile = useIsMobile();

  // Get the actual power value from Firebase data
  let currentPower = 0;
  
  // Only show power if the device is ON (power = 1)
  if (firebaseData?.power === 1) {
    // Try to get real_power first, then fall back to other power fields
    if (firebaseData?.real_power) {
      currentPower = parseFloat(firebaseData.real_power);
    } else if (firebaseData?.power_output) {
      currentPower = parseFloat(firebaseData.power_output);
    } else if (firebaseData?.output_power) {
      currentPower = parseFloat(firebaseData.output_power);
    }
  }

  console.log("Power in SystemTabs:", {
    firebasePower: firebaseData?.power,
    firebaseRealPower: firebaseData?.real_power,
    calculatedPower: currentPower,
    rawFirebaseData: firebaseData
  });

  // Add nominal voltage and power values to parameters if available from firebase
  const extendedParameters = parameters ? {
    ...parameters,
    nominal_voltage: firebaseData?.nominal_voltage || parameters.nominal_voltage,
    // Use the actual power values from Firebase, prioritizing real_power
    real_power: currentPower,
    output_power: currentPower,
    // Ensure battery percentage is from Firebase
    battery_percentage: firebaseData?.battery_percentage || parameters.battery_percentage
  } : null;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid grid-cols-2 bg-black/40 border-orange-500/20">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="control">Control</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        {extendedParameters && (
          <InverterParameters 
            data={extendedParameters} 
            showAdvanced={showAdvanced} 
            deviceCapacity={deviceCapacity} 
          />
        )}
        <PowerConsumptionChart 
          systemCapacity={systemCapacity} 
          currentPower={currentPower}
          firebaseData={firebaseData}
        />
      </TabsContent>
      
      <TabsContent value="control" className="space-y-4">
        <LoadControlPanel inverterId={inverterId} />
      </TabsContent>
    </Tabs>
  );
};
