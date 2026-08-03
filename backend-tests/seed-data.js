import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://eabcgxzlambjgbtmyemy.supabase.co',
  'sb_publishable_IXP3ww4hYvqeyL_UPpj-2w_kD41kmnI'
)

async function seedData() {
  // Login as Maitri to bypass RLS for inserting
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'delhi.maitri@gmail.com',
    password: 'Maitri02',
  })

  if (authError) {
    console.error('Login failed:', authError.message)
    return
  }
  
  console.log('Logged in as:', authData.user.email)

  // 1. Update Maitri's bio (since RLS allows updating own row)
  const { error: bioError } = await supabase
    .from('team_members')
    .update({ bio: 'Full-stack developer working on the core logic.' })
    .eq('email', 'delhi.maitri@gmail.com')

  if (bioError) console.error('Error updating bio:', bioError.message)
  else console.log('Updated bio for Maitri')

  // 2. Insert dummy Milestones
  const { data: milestones, error: milestoneError } = await supabase
    .from('milestones')
    .insert([
      { title: 'Project Kickoff', description: 'Initial setup and planning', status: 'done', due_date: '2026-08-01' },
      { title: 'Backend Setup', description: 'Supabase schema and auth', status: 'in_progress', due_date: '2026-08-10' },
      { title: 'Frontend Skeleton', description: 'React + Tailwind setup', status: 'not_started', due_date: '2026-08-15' }
    ])
    .select()

  if (milestoneError) {
    console.error('Error inserting milestones:', milestoneError.message)
  } else {
    console.log('Inserted milestones:', milestones.length)
  }

  // 3. Insert dummy Tasks
  if (milestones && milestones.length > 0) {
    const { error: taskError } = await supabase
      .from('tasks')
      .insert([
        { title: 'Setup Supabase Project', milestone_id: milestones[0].id, status: 'done', priority: 'high' },
        { title: 'Create DB Schema', milestone_id: milestones[1].id, status: 'done', priority: 'high' },
        { title: 'Implement File Versioning Logic', milestone_id: milestones[1].id, status: 'in_progress', priority: 'high' }
      ])

    if (taskError) {
      console.error('Error inserting tasks:', taskError.message)
    } else {
      console.log('Inserted tasks')
    }
  }
}

seedData()
