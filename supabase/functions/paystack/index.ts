
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not set')
  }

  try {
    const { amount, email, type } = await req.json()
    
    if (type === 'withdrawal') {
      // For withdrawal requests, we'll create a transfer recipient and initiate transfer
      // This is a simplified example - in production you'd want to verify bank details
      const response = await fetch('https://api.paystack.co/transfer/callback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100, // Convert to kobo
          recipient: email,
          reason: 'Withdrawal from ChessStake'
        })
      })

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Handle deposits as before
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          callback_url: `${req.headers.get('origin')}/wallet`
        })
      })

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
