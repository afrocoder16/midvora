import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const payload = {
    businessName: data.businessName,
    yourName: data.yourName,
    businessType: data.businessType,
    cityState: data.cityState,
    currentWebsite: data.currentWebsite,
    email: data.email,
    phone: data.phone,
    message: data.message,
  };

  console.log('[sample-request] New request received:', payload);

  // Phase 3: wire up Resend email sending here

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
