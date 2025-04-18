
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CoinConversionInfo = () => {
  const { data: conversionRate } = useQuery({
    queryKey: ["conversionRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'currency_conversion')
        .single();
      
      if (error) {
        console.error("Error fetching conversion rate:", error);
        return { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 };
      }
      
      return data?.value || { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 };
    }
  });

  const nairaRate = conversionRate?.naira_to_coin || 1000;
  const minDeposit = conversionRate?.min_deposit || 1000;
  const minWithdrawal = conversionRate?.min_withdrawal || 1000;

  return (
    <Card className="bg-chess-dark/90 border-chess-brown/50">
      <CardContent className="pt-6 space-y-2">
        <h3 className="font-semibold text-lg">Currency Conversion</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p className="text-white font-medium">₦{nairaRate} = 1 coin</p>
          <p>• Minimum deposit: ₦{minDeposit.toLocaleString()}</p>
          <p>• Minimum withdrawal: ₦{minWithdrawal.toLocaleString()}</p>
          <div className="mt-3 pt-2 border-t border-gray-700">
            <p className="text-xs">Example Conversions:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Depositing ₦{nairaRate.toLocaleString()} will give you 1 coin</li>
              <li>• Depositing ₦{(nairaRate * 5).toLocaleString()} will give you 5 coins</li>
              <li>• Withdrawing 10 coins will give you ₦{(nairaRate * 10).toLocaleString()}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
