
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY is not set')
    }

    // Verify Paystack webhook signature
    const hash = req.headers.get('x-paystack-signature')
    if (!hash) {
      throw new Error('No Paystack signature found')
    }

    const body = await req.text()
    const event = JSON.parse(body)
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle the event
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const amount = event.data.amount / 100 // Convert from kobo to naira
      
      // Get the transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*, wallet:wallet_id(*)')
        .eq('reference', reference)
        .single()
        
      if (txError) throw txError
      
      if (!transaction) {
        throw new Error('Transaction not found')
      }
      
      // Update transaction status
      await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_details: event.data
        })
        .eq('id', transaction.id)
      
      // Update wallet balance for deposit
      if (transaction.type === 'deposit') {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ 
            balance: transaction.wallet.balance + transaction.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.wallet_id)
          
        if (walletError) throw walletError
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
