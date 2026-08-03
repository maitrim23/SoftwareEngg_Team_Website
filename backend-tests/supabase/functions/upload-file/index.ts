import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { fileName, category = 'other', visibility = 'private', commitMessage, sizeBytes, storageUrl } = await req.json()

    if (!fileName || !commitMessage || !storageUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    // Get team member id
    const { data: teamMember, error: tmError } = await supabaseClient.from('team_members').select('id').eq('auth_user_id', user.id).single()
    if (tmError || !teamMember) {
      return new Response(JSON.stringify({ error: 'Not a team member' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }
    const uploadedBy = teamMember.id;

    // Check if file exists
    const { data: existingFiles, error: searchError } = await supabaseClient.from('files').select('id').eq('name', fileName)
    if (searchError) throw searchError;

    let fileId;
    let versionNumber = 1;

    if (existingFiles && existingFiles.length > 0) {
      fileId = existingFiles[0].id;
      // Get max version number
      const { data: versions, error: versionError } = await supabaseClient.from('file_versions').select('version_number').eq('file_id', fileId).order('version_number', { ascending: false }).limit(1)
      if (versions && versions.length > 0) {
        versionNumber = versions[0].version_number + 1;
      }
    } else {
      // Create new file
      const { data: newFile, error: createError } = await supabaseClient.from('files').insert({
        name: fileName,
        category,
        visibility
      }).select().single()

      if (createError) throw createError;
      fileId = newFile.id;
    }

    // Create file version
    const { data: newVersion, error: versionInsertError } = await supabaseClient.from('file_versions').insert({
      file_id: fileId,
      version_number: versionNumber,
      uploaded_by: uploadedBy,
      storage_url: storageUrl,
      commit_message: commitMessage,
      size_bytes: sizeBytes
    }).select().single()

    if (versionInsertError) throw versionInsertError;

    // Update current_version_id
    const { error: updateError } = await supabaseClient.from('files').update({ current_version_id: newVersion.id }).eq('id', fileId)
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, version: newVersion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
