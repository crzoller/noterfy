'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'
import {
  Sparkles, Eye, Users, TrendingUp, FileText, Calendar,
  Clock, BarChart3, ArrowRight, Settings2, X, Check
} from 'lucide-react'
import type { Release } from '@/types'
import { subDays, differenceInDays } from 'date-fns'

const ALL_CARDS = [
  { id: 'releases_this_month', label: 'Releases This Month', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/20' },
  { id: 'changelog_views', label: 'Changelog Views (30d)', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-600/20' },
  { id: 'subscribers', label: 'Subscribers', icon: Users, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-600/20' },
  { id: 'avg_ctr', label: 'Avg Click-Through Rate', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-600/20' },
  { id: 'top_release', label: 'Top Release Views', icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-600/10 border-pink-600/20' },
  { id: 'days_since_release', label: 'Days Since Last Release', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-600/20' },
  { id: 'pre_post_ratio', label: 'Pre vs Post Releases', icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-600/10 border-cyan-600/20' },
  { id: 'last_release', label: 'Last Release', icon: Calendar, color: 'text-slate-400', bg: 'bg-slate-600/10 border-slate-600/20' },
]

const DEFAULT_CARDS = ['releases_this_month', 'changelog_views', 'subscribers', 'avg_ctr']

interface Props {
  user: { email?: string } | null
  org: { id: string; name: string; slug: string; plan: string; dashboard_preferences?: { enabled_cards?: string[] } } | null
  releases: Release[]
  events: { event_type: string; release_id?: string; created_at: string }[]
  subscriberCount: number
}

export function CustomizableDashboard({ user, org, releases, events, subscriberCount }: Props) {
  const savedCards = org?.dashboard_preferences?.enabled_cards ?? DEFAULT_CARDS
  const [enabledCards, setEnabledCards] = useState<string[]>(savedCards)
  const [customizing, setCustomizing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Compute stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const releasesThisMonth = releases.filter(r => new Date(r.created_at) >= startOfMonth).length

  const last30Days = subDays(now, 30)
  const recentViews = events.filter(e => e.event_type === 'view' && new Date(e.created_at) >= last30Days).length

  const totalViews = events.filter(e => e.event_type === 'view').length
  const totalClicks = events.filter(e => e.event_type === 'click').length
  const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '—'

  const publishedReleases = releases.filter(r => r.status === 'published')
  const lastRelease = publishedReleases[0]
  const daysSinceLast = lastRelease ? differenceInDays(now, new Date(lastRelease.published_at || lastRelease.created_at)) : null

  // Top release by views
  const releaseViewCounts = releases.map(r => ({
    release: r,
    views: events.filter(e => e.event_type === 'view' && e.release_id === r.id).length,
  })).sort((a, b) => b.views - a.views)
  const topRelease = releaseViewCounts[0]

  const preCount = releases.filter(r => r.release_type === 'pre').length
  const postCount = releases.filter(r => r.release_type === 'post').length

  const planLimits: Record<string, number> = { free: 3, starter: 15, pro: Infinity, business: Infinity }
  const limit = planLimits[org?.plan ?? 'free']

  const getCardValue = (id: string): string => {
    switch (id) {
      case 'releases_this_month': return limit === Infinity ? String(releasesThisMonth) : `${releasesThisMonth} / ${limit}`
      case 'changelog_views': return recentViews > 0 ? String(recentViews) : '—'
      case 'subscribers': return String(subscriberCount)
      case 'avg_ctr': return avgCTR
      case 'top_release': return topRelease ? String(topRelease.views) : '—'
      case 'days_since_release': return daysSinceLast !== null ? `${daysSinceLast}d` : '—'
      case 'pre_post_ratio': return `${preCount} / ${postCount}`
      case 'last_release': return lastRelease ? formatDateShort(lastRelease.published_at || lastRelease.created_at) : '—'
      default: return '—'
    }
  }

  const getCardSub = (id: string): string => {
    switch (id) {
      case 'top_release': return topRelease?.release.title.slice(0, 30) + '...' || ''
      case 'pre_post_ratio': return 'pre / post'
      case 'last_release': return lastRelease?.title.slice(0, 25) + '...' || ''
      default: return ''
    }
  }

  async function savePreferences(cards: string[]) {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('organizations')
      .update({ dashboard_preferences: { enabled_cards: cards } })
      .eq('id', org?.id)
    setSaving(false)
    setCustomizing(false)
  }

  function toggleCard(id: string) {
    setEnabledCards(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const visibleCards = ALL_CARDS.filter(c => enabledCards.includes(c.id))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setCustomizing(true)}>
            <Settings2 className="w-4 h-4" />
            Customize
          </Button>
          <Link href="/generate">
            <Button size="md">
              <Sparkles className="w-4 h-4" />
              Generate Release Notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Customize modal */}
      {customizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Customize Dashboard</h2>
                <p className="text-sm text-slate-400 mt-0.5">Choose which stats to display</p>
              </div>
              <button onClick={() => { setCustomizing(false); setEnabledCards(savedCards) }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {ALL_CARDS.map(card => {
                const enabled = enabledCards.includes(card.id)
                const Icon = card.icon
                return (
                  <button
                    key={card.id}
                    onClick={() => toggleCard(card.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                      enabled
                        ? 'border-blue-600/50 bg-blue-600/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.bg}`}>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <span className="text-sm font-medium text-white flex-1">{card.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      enabled ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}>
                      {enabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="p-6 border-t border-slate-800 flex gap-3">
              <Button
                onClick={() => savePreferences(enabledCards)}
                loading={saving}
                className="flex-1"
              >
                Save Layout
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setEnabledCards(DEFAULT_CARDS) }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {visibleCards.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-slate-800 border-dashed">
          <p className="text-slate-400 text-sm mb-3">No cards selected</p>
          <Button variant="secondary" size="sm" onClick={() => setCustomizing(true)}>
            <Settings2 className="w-4 h-4" />
            Add cards
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCards.map(card => {
            const Icon = card.icon
            const sub = getCardSub(card.id)
            return (
              <Card key={card.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-white truncate">{getCardValue(card.id)}</div>
                  <div className="text-xs text-slate-400 truncate">{sub || card.label}</div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent releases */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Releases</h2>
          <Link href="/releases">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {releases.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">No releases yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Connect GitHub and merge a PR — release notes will appear here automatically.
            </p>
            <Link href="/generate">
              <Button>
                <Sparkles className="w-4 h-4" />
                Generate your first release
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {releases.slice(0, 6).map(release => (
              <Link key={release.id} href={`/releases/${release.id}`}>
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${release.release_type === 'pre' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                        {release.title}
                        {release.version && <span className="text-slate-500 ml-2 font-normal">{release.version}</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDateShort(release.created_at)}</div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-4">
                    <StatusBadge status={release.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
