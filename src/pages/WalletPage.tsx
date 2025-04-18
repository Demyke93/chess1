
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CoinConversionInfo } from '@/components/CoinConversionInfo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (walletError) throw walletError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_demo')
        .eq('id', user?.id)
        .single();
      
      if (profileError) throw profileError;

      return { ...walletData, is_demo: profileData.is_demo };
    },
    enabled: !!user,
  });

  const handleDeposit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to make a deposit',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user.email) {
      toast({
        title: 'Error',
        description: 'No email found for your account. Please update your profile.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: Number(amount),
          email: user.email,
          type: 'deposit'
        },
      });

      if (response.data.status) {
        window.location.href = response.data.data.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleWithdrawal = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to make a withdrawal',
        variant: 'destructive',
      });
      return;
    }

    try {
      const withdrawalAmount = Number(amount);
      if (withdrawalAmount < 1000) {
        throw new Error('Minimum withdrawal amount is ₦1,000');
      }

      const coins = withdrawalAmount / 1000;
      if (wallet?.balance && coins > wallet.balance) {
        throw new Error('Insufficient coins for withdrawal');
      }

      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: withdrawalAmount,
          email: user.email,
          type: 'withdrawal'
        },
      });

      if (response.data.status) {
        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
        });
        setAmount('');
      } else {
        throw new Error('Failed to process withdrawal');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Wallet</h1>
      
      {wallet?.is_demo && (
        <Card className="border-yellow-600/50 bg-yellow-900/20">
          <CardContent className="p-6">
            <h3 className="text-yellow-500 font-semibold text-lg mb-2">Demo Account</h3>
            <p className="text-yellow-400/80">
              This is a demo account. While you can practice with demo coins, they cannot be used in real matches. 
              To play real matches, please create a regular account.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-chess-brown/50 bg-chess-dark/90">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Your current balance and transaction options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-2xl font-bold">
                {isLoading ? 'Loading...' : `${wallet?.balance || 0} coins`}
              </div>

              <Tabs defaultValue="deposit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                </TabsList>
                <TabsContent value="deposit" className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      min="1000"
                      step="1000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount in Naira (₦)"
                    />
                    <Button onClick={handleDeposit}>
                      Deposit
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="withdraw" className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      min="1000"
                      step="1000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount in Naira (₦)"
                    />
                    <Button 
                      onClick={handleWithdrawal}
                      disabled={wallet?.is_demo}
                    >
                      Withdraw
                    </Button>
                  </div>
                  {wallet?.is_demo && (
                    <p className="text-yellow-500 text-sm">
                      Withdrawals are not available for demo accounts
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <CoinConversionInfo />
      </div>
    </div>
  );
};

export default WalletPage;
