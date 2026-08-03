import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eabcgxzlambjgbtmyemy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IXP3ww4hYvqeyL_UPpj-2w_kD41kmnI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runChecks() {
  console.log('--- BACKEND READINESS CHECKS ---')
  
  // 1. Connection & Data Integrity Check
  console.log('\n[1] Checking Database Connection & Schema...')
  const { data: members, error: membersErr } = await supabase.from('team_members').select('*')
  if (membersErr) {
    console.log('❌ Failed to fetch team members:', membersErr.message)
  } else {
    console.log('✅ Connection successful. Team members found:', members.length)
  }

  // 2. Authentication & RLS Security Checks
  console.log('\n[2] Checking Authentication & RLS (Anonymous vs Authenticated)...')
  
  // Anonymous test (milestones should be readable, but tasks shouldn't be writable)
  const { data: anonMilestones, error: anonMilestonesErr } = await supabase.from('milestones').select('*')
  if (anonMilestonesErr) console.log('❌ Anonymous read milestones failed:', anonMilestonesErr.message)
  else console.log('✅ Anonymous read milestones allowed.')

  const { error: anonInsertErr } = await supabase.from('tasks').insert({ title: 'Hack the system', status: 'todo', priority: 'high' })
  if (anonInsertErr) {
    console.log('✅ Anonymous write to tasks blocked by RLS as expected.')
  } else {
    console.log('❌ SECURITY FLAW: Anonymous user could write to tasks!')
  }

  // Authenticated test
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'delhi.maitri@gmail.com',
    password: 'Maitri02',
  })

  if (authError) {
    console.log('❌ Authentication failed:', authError.message)
  } else {
    console.log('✅ Authentication successful for team member.')
    
    // 3. Foreign Key Integrity Check
    console.log('\n[3] Checking Database Constraints (Foreign Keys)...')
    const { error: fkError } = await supabase.from('tasks').insert({ 
      title: 'Invalid task', 
      status: 'todo', 
      priority: 'high',
      assignee_id: '00000000-0000-0000-0000-000000000000' // Invalid UUID that doesn't exist
    })
    
    if (fkError && fkError.code === '23503') { // Postgres foreign key violation code
      console.log('✅ Foreign key constraint correctly enforced (blocked invalid assignee).')
    } else if (fkError) {
      console.log('❓ Insert failed, but maybe not due to FK:', fkError.message)
    } else {
      console.log('❌ INTEGRITY FLAW: Allowed inserting task with non-existent assignee!')
    }
  }

  // 4. API & Edge Function Check
  console.log('\n[4] Checking Edge Function Deployment...')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Empty body to trigger validation error instead of 404
    })
    
    const data = await response.json()
    if (response.status === 400 && data.error === 'Missing required fields') {
      console.log('✅ Edge function is deployed and rejecting invalid requests correctly.')
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ Edge function requires authentication.')
    } else if (response.status === 404) {
      console.log('❌ Edge function not found. Did you deploy it?')
    } else {
      console.log(`❓ Edge function returned unexpected status ${response.status}:`, data)
    }
  } catch (err) {
    console.log('❌ Failed to reach Edge Function:', err.message)
  }
}

runChecks()
