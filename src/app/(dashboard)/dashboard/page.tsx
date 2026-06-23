import { createClient } from '@/lib/supabase/server'
import { CustomizableDashboard } from './customizable-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase.from('organizations').select('*').single()
  const { data: releases } = await supabase.from('releases').select('*').order('created_at', { ascending: false })
  const { data: events } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false })
  const { data: subscribers } = await supabase.from('subscribers').select('id')

  return (
    <CustomizableDashboard
      user={user}
      org={org}
      releases={releases ?? []}
      events={events ?? []}
      subscriberCount={subscribers?.length ?? 0}
    />
  )
}
