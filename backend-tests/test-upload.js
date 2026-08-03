import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eabcgxzlambjgbtmyemy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IXP3ww4hYvqeyL_UPpj-2w_kD41kmnI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testUploadFlow() {
  console.log('1. Logging in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'delhi.maitri@gmail.com',
    password: 'Maitri02',
  })

  if (authError) {
    console.error('Login failed:', authError.message)
    return
  }
  const session = authData.session;
  console.log('Logged in as:', session.user.email)

  const fileName = `test-upload-${Date.now()}.txt`
  
  console.log('2. Uploading file to storage bucket (project-files)...')
  // Try uploading a small text file
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('project-files')
    .upload(fileName, 'Hello world content', {
      contentType: 'text/plain'
    })

  if (storageError) {
    console.error('❌ Storage upload failed:', storageError.message)
    // We will still try to call the edge function to see if it works
  } else {
    console.log('✅ Storage upload success:', storageData.path)
  }

  const storageUrl = storageData ? storageData.path : fileName

  console.log('3. Calling Edge Function...')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: fileName,
        category: 'other',
        visibility: 'private',
        commitMessage: 'Initial commit for test file',
        sizeBytes: 19,
        storageUrl: storageUrl
      })
    })
    
    const data = await response.json()
    if (!response.ok) {
      console.error('❌ Edge function failed with status:', response.status)
      console.error('Response data:', data)
    } else {
      console.log('✅ Edge function success:', data)
    }
  } catch (err) {
    console.error('❌ Edge function fetch error:', err.message)
  }
}

testUploadFlow()
