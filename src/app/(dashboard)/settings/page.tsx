'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { GitBranch, Check, Link as LinkIcon, CreditCard, Users, Copy } from 'lucide-react'

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://noterfy.app'
  const [jiraUrl, setJiraUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: org } = await supabase.from('organizations').select('*').single()
      if (org) {
        setOrgId(org.id)
        setOrgName(org.name || '')
        setOrgSlug(org.slug || '')
      }

      const { data: integrations } = await supabase.from('integrations').select('*')
      if (integrations) {
        const gh = integrations.find(i => i.type === 'github')
        const jira = integrations.find(i => i.type === 'jira')
        if (gh) {
          setGithubToken(gh.credentials?.token || '')
          setWebhookSecret(gh.credentials?.webhook_secret || '')
        }
        if (jira) {
          setJiraUrl(jira.credentials?.url || '')
          setJiraEmail(jira.credentials?.email || '')
          setJiraToken(jira.credentials?.token || '')
        }
      }
    }
    load()
  }, [])

  async function saveOrg() {
    setSaving(true)
    const supabase = createClient()
    if (orgId) {
      await supabase.from('organizations').update({ name: orgName, slug: orgSlug }).eq('id', orgId)
    }
    setSaving(false)
    setSaved('org')
    setTimeout(() => setSaved(null), 3000)
  }

  async function saveGitHub() {
    setSaving(true)
    const supabase = createClient()
    const { data: org } = await supabase.from('organizations').select('id').single()
    const { data: existing } = await supabase.from('integrations').select('id').eq('type', 'github').single()
    const payload = { org_id: org?.id, type: 'github', credentials: { token: githubToken, webhook_secret: webhookSecret }, connected_at: new Date().toISOString() }

    if (existing) {
      await supabase.from('integrations').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('integrations').insert(payload)
    }
    setSaving(false)
    setSaved('github')
    setTimeout(() => setSaved(null), 3000)
  }

  async function saveJira() {
    setSaving(true)
    const supabase = createClient()
    const { data: org } = await supabase.from('organizations').select('id').single()
    const { data: existing } = await supabase.from('integrations').select('id').eq('type', 'jira').single()
    const payload = { org_id: org?.id, type: 'jira', credentials: { url: jiraUrl, email: jiraEmail, token: jiraToken }, connected_at: new Date().toISOString() }

    if (existing) {
      await supabase.from('integrations').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('integrations').insert(payload)
    }
    setSaving(false)
    setSaved('jira')
    setTimeout(() => setSaved(null), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your workspace, integrations, and billing.</p>
      </div>

      {/* Organization */}
      <Card>
        <CardTitle className="mb-1">Organization</CardTitle>
        <CardDescription className="mb-5">Your workspace name and public changelog URL.</CardDescription>
        <div className="space-y-4">
          <Input label="Organization name" value={orgName} onChange={e => setOrgName(e.target.value)} id="org-name" />
          <div>
            <Input
              label="Changelog slug"
              value={orgSlug}
              onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              id="org-slug"
            />
            {orgSlug && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {appUrl}/changelog/{orgSlug}
              </p>
            )}
          </div>
          <Button onClick={saveOrg} loading={saving && saved !== 'org'}>
            {saved === 'org' ? <><Check className="w-4 h-4" /> Saved</> : 'Save Organization'}
          </Button>
        </div>
      </Card>

      {/* GitHub Integration */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <GitBranch className="w-5 h-5 text-white" />
          <CardTitle>GitHub Integration</CardTitle>
        </div>
        <CardDescription className="mb-5">
          When a PR is merged on GitHub, Noterfy automatically generates and publishes release notes.
        </CardDescription>
        <div className="space-y-5">
          <Input
            label="Personal access token"
            type="password"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            id="github-token"
          />
          <p className="text-xs text-slate-500">
            Needs <code className="bg-slate-800 px-1 rounded">repo</code> scope. Create one at GitHub → Settings → Developer settings → Personal access tokens.
          </p>

          <Input
            label="Webhook secret (optional but recommended)"
            type="password"
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            placeholder="A random secret string you choose"
            id="webhook-secret"
          />

          <Button onClick={saveGitHub} disabled={!githubToken}>
            {saved === 'github' ? <><Check className="w-4 h-4" /> Saved</> : 'Save GitHub Settings'}
          </Button>

          {/* Webhook setup instructions */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 space-y-3">
            <div className="text-sm font-medium text-white">Set up the GitHub Webhook</div>
            <p className="text-xs text-slate-400">
              In your GitHub repo, go to <strong className="text-slate-300">Settings → Webhooks → Add webhook</strong> and use these values:
            </p>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">Payload URL</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-blue-400 flex-1 break-all">
                    {appUrl}/api/webhooks/github
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${appUrl}/api/webhooks/github`)
                      setCopiedWebhook(true)
                      setTimeout(() => setCopiedWebhook(false), 2000)
                    }}
                    className="p-2 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Content type</div>
                  <code className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300">application/json</code>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Which events?</div>
                  <code className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300">Pull requests only</code>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Set the <strong className="text-slate-400">Secret</strong> field to match your webhook secret above. Then every merged PR will automatically generate release notes.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Jira Integration */}
      <Card>
        <CardTitle className="mb-1">Jira Integration</CardTitle>
        <CardDescription className="mb-5">Connect Jira to pull tickets for release notes.</CardDescription>
        <div className="space-y-4">
          <Input
            label="Jira URL"
            value={jiraUrl}
            onChange={e => setJiraUrl(e.target.value)}
            placeholder="https://yourcompany.atlassian.net"
            id="jira-url"
          />
          <Input
            label="Jira email"
            type="email"
            value={jiraEmail}
            onChange={e => setJiraEmail(e.target.value)}
            placeholder="you@company.com"
            id="jira-email"
          />
          <Input
            label="Jira API token"
            type="password"
            value={jiraToken}
            onChange={e => setJiraToken(e.target.value)}
            placeholder="Your Jira API token"
            id="jira-token"
          />
          <p className="text-xs text-slate-500">Generate an API token at id.atlassian.com → Security → API tokens.</p>
          <Button onClick={saveJira} disabled={!jiraUrl || !jiraEmail || !jiraToken}>
            {saved === 'jira' ? <><Check className="w-4 h-4" /> Connected</> : 'Save Jira Integration'}
          </Button>
        </div>
      </Card>

      {/* Subscription */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="w-5 h-5 text-white" />
          <CardTitle>Subscription</CardTitle>
        </div>
        <CardDescription className="mb-5">Your current plan and usage.</CardDescription>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-700 text-slate-300">Free Plan</span>
          <span className="text-sm text-slate-400">3 releases/month</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { name: 'Starter', price: '$29/mo', features: '15 releases, hosted changelog' },
            { name: 'Pro', price: '$79/mo', features: 'Unlimited, blog gen, analytics' },
            { name: 'Business', price: '$149/mo', features: 'Everything + team + API' },
          ].map(plan => (
            <div key={plan.name} className="rounded-xl border border-slate-700 p-4 text-center">
              <div className="font-semibold text-white text-sm">{plan.name}</div>
              <div className="text-blue-400 font-bold my-1">{plan.price}</div>
              <div className="text-xs text-slate-500">{plan.features}</div>
            </div>
          ))}
        </div>
        <Button variant="outline">Upgrade Plan</Button>
      </Card>

      {/* Account */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <Users className="w-5 h-5 text-white" />
          <CardTitle>Account</CardTitle>
        </div>
        <CardDescription className="mb-4">Your account details.</CardDescription>
        <div className="text-sm text-slate-300">
          <span className="text-slate-500">Signed in as </span>
          {user?.email}
        </div>
      </Card>
    </div>
  )
}
