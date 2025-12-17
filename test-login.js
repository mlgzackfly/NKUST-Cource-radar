const fetch = require('node-fetch');

async function testLogin() {
  const email = 'C109193108@nkust.edu.tw';
  const baseUrl = 'http://127.0.0.1:3000';

  try {
    // 1. Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    console.log('   CSRF Token:', csrfToken);

    // 2. Send magic link
    console.log('\n2. Sending magic link to', email);
    const signInRes = await fetch(`${baseUrl}/api/auth/signin/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        csrfToken,
        callbackUrl: baseUrl,
      }),
      redirect: 'manual'
    });

    console.log('   Response status:', signInRes.status);
    console.log('   Response headers:', signInRes.headers.raw());

    if (signInRes.status === 302) {
      console.log('   ✓ Magic link sent successfully!');
      console.log('   Please check your email:', email);
    } else {
      const text = await signInRes.text();
      console.log('   Response body:', text);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
