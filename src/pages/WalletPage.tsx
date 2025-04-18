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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: wallet, isLoading, refetch } = useQuery({
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

  const { data: banks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.paystack.co/bank');
        const data = await response.json();
        return data.status ? data.data : [];
      } catch (error) {
        console.error('Error fetching banks:', error);
        return [];
      }
    },
  });

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
        return { value: { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 } };
      }
      
      return data || { value: { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 } };
    }
  });

  const nairaRate = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).naira_to_coin || 1000 
    : 1000;
  const minDeposit = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).min_deposit || 1000 
    : 1000;
  const minWithdrawal = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).min_withdrawal || 1000 
    : 1000;

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

    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount < minDeposit) {
      toast({
        title: 'Error',
        description: `Minimum deposit amount is ₦${minDeposit.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: depositAmount,
          email: user.email,
          type: 'deposit'
        },
      });

      if (response.data.status) {
        // Create a pending transaction record
        await supabase.from('transactions').insert({
          wallet_id: wallet?.id,
          amount: depositAmount / nairaRate, // Convert to coins
          type: 'deposit',
          status: 'pending',
          reference: response.data.data.reference
        });
        
        // Redirect to Paystack checkout
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

  const verifyAccount = async () => {
    if (!accountNumber || !bankCode) {
      toast({
        title: 'Error',
        description: 'Please enter your account number and select a bank',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}`
        }
      });
      
      const data = await response.json();
      if (data.status) {
        setAccountName(data.data.account_name);
        toast({
          title: 'Success',
          description: 'Account verified successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Unable to verify account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify account',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawal = async (e: FormEvent) => {
    e.preventDefault();
    
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
      if (isNaN(withdrawalAmount) || withdrawalAmount < minWithdrawal) {
        throw new Error(`Minimum withdrawal amount is ₦${minWithdrawal.toLocaleString()}`);
      }

      const coins = withdrawalAmount / nairaRate;
      if (wallet?.balance && coins > wallet.balance) {
        throw new Error('Insufficient coins for withdrawal');
      }

      if (!accountNumber || !bankCode || !accountName) {
        throw new Error('Please verify your account details first');
      }

      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: withdrawalAmount,
          email: user.email,
          type: 'withdrawal',
          accountNumber,
          bankCode
        },
      });

      if (response.data.status) {
        // Create a transaction record
        await supabase.from('transactions').insert({
          wallet_id: wallet?.id,
          amount: coins,
          type: 'withdrawal',
          status: 'processing',
          payout_details: {
            account_number: accountNumber,
            bank_code: bankCode,
            account_name: accountName,
            reference: response.data.data.reference
          }
        });

        // Update wallet balance
        await supabase.from('wallets').update({
          balance: (wallet?.balance || 0) - coins,
          updated_at: new Date().toISOString()
        }).eq('id', wallet?.id);

        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
        });
        setAmount('');
        setIsWithdrawalOpen(false);
        refetch();
      } else {
        throw new Error('Failed to process withdrawal: ' + (response.data.message || 'Unknown error'));
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
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-chess-accent"></div>
    </div>;
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

              {wallet?.is_demo ? (
                <p className="text-yellow-400 text-sm">
                  Demo accounts have coins for practice only and cannot participate in real matches.
                </p>
              ) : (
                <Tabs defaultValue="deposit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                  </TabsList>
                  <TabsContent value="deposit" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount (₦)</label>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          min={minDeposit}
                          step="100"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Minimum: ₦${minDeposit.toLocaleString()}`}
                        />
                        <Button onClick={handleDeposit}>
                          Deposit
                        </Button>
                      </div>
                      {amount && !isNaN(Number(amount)) && (
                        <p className="text-sm text-gray-400">
                          You'll receive {(Number(amount) / nairaRate).toFixed(2)} coins
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="withdraw" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount (₦)</label>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          min={minWithdrawal}
                          step="100"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Minimum: ₦${minWithdrawal.toLocaleString()}`}
                        />
                        <Button 
                          onClick={() => setIsWithdrawalOpen(true)}
                        >
                          Withdraw
                        </Button>
                      </div>
                      {amount && !isNaN(Number(amount)) && (
                        <p className="text-sm text-gray-400">
                          Requires {(Number(amount) / nairaRate).toFixed(2)} coins from your balance
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </CardContent>
        </Card>

        <CoinConversionInfo />
      </div>

      <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
        <DialogContent className="bg-chess-dark border-chess-brown text-white">
          <DialogHeader>
            <DialogTitle>Withdrawal</DialogTitle>
            <DialogDescription>
              Enter your bank account details to withdraw ₦{Number(amount).toLocaleString() || '0'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank</label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
              <Input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter 10-digit account number"
                maxLength={10}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={verifyAccount}
                disabled={isVerifying || !bankCode || !accountNumber}
              >
                {isVerifying ? 'Verifying...' : 'Verify Account'}
              </Button>
              
              {accountName && (
                <div className="text-green-400 text-sm font-medium">
                  {accountName}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsWithdrawalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!accountName || !bankCode || !accountNumber}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
