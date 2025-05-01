
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";

// Generate demo data for the chart with real current value
const generateHourlyData = (capacity: number, currentPower: number = 0) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const currentHour = new Date().getHours();
  
  return hours.map(hour => {
    // Create a power curve based on time of day
    const isPeak = hour >= 18 && hour <= 21; 
    const isMorning = hour >= 6 && hour <= 9;
    const baseline = Math.random() * 0.3 * capacity; // 0-30% of capacity as baseline
    
    // Use the real value for the current hour
    if (hour === currentHour) {
      return {
        hour: `${hour}:00`,
        power: currentPower || Math.round(baseline), // Use real power or fallback
        surgeThreshold: Math.round(capacity * 0.85)
      };
    }
    
    // Generate simulated values for other hours
    let power = isPeak 
      ? baseline + (Math.random() * 0.5 * capacity) // Higher during peak
      : isMorning
        ? baseline + (Math.random() * 0.3 * capacity) // Medium during morning
        : baseline; // Baseline during other times
    
    return {
      hour: `${hour}:00`,
      power: Math.round(power),
      surgeThreshold: Math.round(capacity * 0.85)
    };
  });
};

interface PowerConsumptionChartProps {
  systemCapacity: number;
  currentPower?: number;
  firebaseData?: any;
}

export const PowerConsumptionChart = ({ 
  systemCapacity, 
  currentPower = 0,
  firebaseData
}: PowerConsumptionChartProps) => {
  const [data, setData] = useState<any[]>([]);
  const isMobile = useIsMobile();

  // Update chart data when currentPower changes
  useEffect(() => {
    // Extract power from firebaseData if available
    let realPower = currentPower;
    if (firebaseData) {
      realPower = firebaseData.power === 1 
        ? (firebaseData.output_power || firebaseData.real_power || firebaseData.power_output || currentPower) 
        : 0;
    }
    
    setData(generateHourlyData(systemCapacity, realPower));
  }, [currentPower, systemCapacity, firebaseData]);

  const maxValue = systemCapacity * 1.1; // 110% of capacity for chart upper bound

  const chartConfig = {
    power: {
      label: "Power",
      theme: {
        light: "#F97316", // Orange
        dark: "#F97316",
      },
    },
    surgeThreshold: {
      label: "Surge Threshold (85%)",
      theme: {
        light: "#EF4444", // Red
        dark: "#EF4444",
      },
    },
  };

  return (
    <div className="w-full h-64 sm:h-80 p-3 sm:p-4 bg-black/40 rounded-lg border border-orange-500/20">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">Power Consumption (24h)</h3>
      <ChartContainer 
        config={chartConfig} 
        className="h-48 sm:h-64"
      >
        <AreaChart
          data={data}
          margin={{ 
            top: 10, 
            right: isMobile ? 10 : 30, 
            left: isMobile ? -20 : 0, 
            bottom: 0 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="hour" 
            stroke="#999" 
            tickFormatter={(value) => value.split(':')[0]} 
            tick={{ fontSize: isMobile ? 10 : 12 }}
            interval={isMobile ? 2 : 1}
          />
          <YAxis 
            stroke="#999" 
            domain={[0, maxValue]} 
            tickFormatter={(value) => `${value}W`} 
            tick={{ fontSize: isMobile ? 10 : 12 }}
            width={isMobile ? 40 : 45}
          />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                formatter={(value, name) => [`${value}W`, name === "surgeThreshold" ? "Surge Threshold" : "Power"]}
              />
            } 
          />
          <defs>
            <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <ReferenceLine 
            y={systemCapacity * 0.85} 
            stroke="#EF4444" 
            strokeDasharray="3 3" 
            label={isMobile ? null : { value: "Surge", position: "insideBottomRight", fill: "#EF4444", fontSize: 12 }} 
          />
          <Area 
            type="monotone" 
            dataKey="power" 
            stroke="#F97316" 
            fillOpacity={1}
            fill="url(#powerGradient)" 
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};
