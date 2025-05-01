
import { InverterParameters } from "@/components/inverter/InverterParameters";
import { LoadControlPanel } from "@/components/inverter/LoadControlPanel";
import { PowerConsumptionChart } from "@/components/inverter/PowerConsumptionChart";
import { InverterDataDisplay } from "@/components/inverter/InverterDataDisplay";
import { DeviceStatusMonitor } from "@/components/inverter/DeviceStatusMonitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { InverterSystemParameters } from "./types";

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
  // Calculate system capacity for PowerConsumptionChart
  const systemCapacity = parameters?.output_capacity || 3000;
  const isMobile = useIsMobile();

  // Extract power data from Firebase for the chart
  const power = firebaseData?.power === 1 ? (firebaseData?.output_power || firebaseData?.real_power || 0) : 0;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-3'} bg-black/40 border-orange-500/20`}>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="controls">Controls</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        {parameters && (
          <InverterParameters data={parameters} showAdvanced={showAdvanced} />
        )}
        <PowerConsumptionChart 
          systemCapacity={systemCapacity} 
          currentPower={power}
          firebaseData={firebaseData}
        />
      </TabsContent>
      
      <TabsContent value="controls" className="space-y-4">
        <LoadControlPanel inverterId={inverterId} />
      </TabsContent>
      
      <TabsContent value="data" className="space-y-4">
        <DeviceStatusMonitor inverterId={inverterId} />
        {(deviceData || firebaseData) && (
          <InverterDataDisplay 
            deviceData={deviceData} 
            inverterId={inverterId} 
            firebaseData={firebaseData} 
          />
        )}
      </TabsContent>
    </Tabs>
  );
};
