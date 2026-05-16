import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const payload = {
    businessName: data.get('businessName'),
    businessType: data.get('businessType'),
    city: data.get('city'),
    contact: data.get('contact'),
  };

  console.log('[sample-request] New request received:', payload);

  // Phase 3: wire up Resend email sending here

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
