// test-login.js — run with: node test-login.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://eabcgxzlambjgbtmyemy.supabase.co',
  'sb_publishable_IXP3ww4hYvqeyL_UPpj-2w_kD41kmnI'
)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'delhi.maitri@gmail.com',
  password: 'Maitri02',
})
console.log(error ? { error: error.message } : { success: true, user: data.user.email })

const { data: milestones, error: readError } = await supabase
  .from('milestones')
  .select('*')
console.log(readError ? { readError: readError.message } : { milestones })

const { data: members, error: memberError } = await supabase
  .from('team_members')
  .select('*')
console.log(memberError ? { memberError: memberError.message } : { members })