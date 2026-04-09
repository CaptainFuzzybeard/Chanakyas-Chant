'use client'

import { useState, useEffect } from 'react'

interface TutorialStep {
  id:       string
  title:    string
  body:     string
  anchor?:  string  // CSS selector to highlight (visual only, no DOM manipulation)
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface FirstTimeTutorialProps {
  page:    'card-bank' | 'cabinet' | 'dashboard' | 'leagues' | 'politician-detail'
  visible: boolean
  onDone:  () => void
}

const TUTORIALS: Record<FirstTimeTutorialProps['page'], TutorialStep[]> = {
  'card-bank': [
    {
      id:       'cb-1',
      title:    'Pick your politicians',
      body:     'Browse all 543 Lok Sabha MPs (or your state\'s MLAs). Click any card to add them to your roster. You need at least 12 to form a cabinet — up to 20 total.',
      position: 'center',
    },
    {
      id:       'cb-2',
      title:    'Reading composite scores',
      body:     'The large number (e.g. 724) is the composite score — a weighted sum of 6 governance tracks. Higher is better. The small ▲▼ shows this week\'s movement.',
      position: 'center',
    },
    {
      id:       'cb-3',
      title:    'Stat bars',
      body:     'Green bars (70+) are strong stats. Amber (40–69) is average. Red means weak or a penalty is dragging the score down. Match stat strengths to ministry anchors for a ×1.2 bonus.',
      position: 'center',
    },
    {
      id:       'cb-4',
      title:    'Tags tell you the story',
      body:     '↑ Rising = momentum upward. ☁ Scam cloud = legal case filed, score penalised. ? Sycophancy = score held back, awaiting verification. ⊘ Disputed = frozen score.',
      position: 'center',
    },
    {
      id:       'cb-5',
      title:    'Coalition rule: max 4 per party',
      body:     'You can draft at most 4 politicians from any single party. This reflects India\'s coalition politics — and it means the best cabinet mixes parties strategically.',
      position: 'center',
    },
  ],
  'cabinet': [
    {
      id:       'cab-1',
      title:    'Assign ministry positions',
      body:     'Click a politician in the bench panel on the right, then click an empty ministry slot to assign them. Fill all 12 positions to go live.',
      position: 'center',
    },
    {
      id:       'cab-2',
      title:    'Anchor matches earn ×1.2',
      body:     'Each ministry has an anchor stat (e.g. Infrastructure ministry → high Infrastructure score). If your politician\'s best stat matches, they earn a ×1.2 multiplier. The ✦ symbol marks a match.',
      position: 'center',
    },
    {
      id:       'cab-3',
      title:    'PM/CM earns ×1.5',
      body:     'The Prime Minister / Chief Minister slot gives a ×1.5 multiplier to whoever you put there — your highest-scoring politician should usually be your captain.',
      position: 'center',
    },
    {
      id:       'cab-4',
      title:    'Coalition balance bar',
      body:     'The sidebar shows how many politicians you have from each party. Each bar fills toward 4/4. A maxed-out bar (red) means you can\'t draft more from that party.',
      position: 'center',
    },
    {
      id:       'cab-5',
      title:    'Set your conviction',
      body:     'Each assigned minister has a conviction slider — Doubt / Cautious / Neutral / Believe / Certain. Set it high on politicians you trust; they\'ll amplify your gains when they perform well, but also your losses when they don\'t. Lock in by Saturday midnight IST.',
      position: 'center',
    },
  ],
  'dashboard': [
    {
      id:       'dash-1',
      title:    'Your cabinet score',
      body:     'Your cabinet score is the sum of all 12 politicians\' composite scores, adjusted for position multipliers. It updates daily as real governance news is processed.',
      position: 'center',
    },
    {
      id:       'dash-2',
      title:    'Tap ? to see a score breakdown',
      body:     'Each slot in your cabinet grid has a small ? in the corner. Tap it to see exactly how that politician\'s score is built — which stats are contributing and how much.',
      position: 'center',
    },
    {
      id:       'dash-3',
      title:    'Weekly rank lock',
      body:     'Ranks are locked every Sunday at midnight IST. Your rank reflects your score at that moment. Watch the weekly movers section to spot who\'s rising before the lock.',
      position: 'center',
    },
  ],
  'leagues': [
    {
      id:       'lg-1',
      title:    'You\'re in two leagues',
      body:     'The National Lok Sabha League includes everyone. Private leagues are for friends — you\'ll need an invite code to join, or create your own with a Pro account.',
      position: 'center',
    },
    {
      id:       'lg-2',
      title:    'Coalitions',
      body:     'You can partner with one other player to form a coalition. Your coalition score is the average of both cabinet scores — updated at every rank lock. Browse the leaderboard to find a complementary partner.',
      position: 'center',
    },
  ],
  'politician-detail': [
    {
      id:       'pd-1',
      title:    'The full picture',
      body:     'This page shows everything: all 6 stat tracks, 30-day score history, last 5 score events with source tiers, and the best ministry positions for this politician.',
      position: 'center',
    },
    {
      id:       'pd-2',
      title:    'Source tiers matter',
      body:     'T1 (PIB, ECI, Sansad) carries full weight. T2 (Hindu, IE, Reuters) carries 80%. T3 and below need corroboration. A single T4 source alone won\'t move a score.',
      position: 'center',
    },
  ],
}

const STORAGE_KEY = 'cc_tutorial_done'

function getTutorialsDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markTutorialDone(page: string) {
  try {
    const done = getTutorialsDone()
    done.add(page)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...Array.from(done)]))
  } catch { /* ignore */ }
}

export function FirstTimeTutorial({ page, visible, onDone }: FirstTimeTutorialProps) {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) return
    // Only show if this page's tutorial hasn't been completed
    const done = getTutorialsDone()
    if (!done.has(page)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setShow(true), 600)
      return () => clearTimeout(t)
    }
  }, [visible, page])

  if (!show) return null

  const steps  = TUTORIALS[page]
  const current = steps[step]
  const isLast  = step === steps.length - 1

  function handleNext() {
    if (isLast) {
      markTutorialDone(page)
      setShow(false)
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  function handleSkip() {
    markTutorialDone(page)
    setShow(false)
    onDone()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(15,27,45,.55)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={handleSkip}
      />

      {/* Card */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 200,
        width: '400px',
        background: 'var(--bg1)',
        border: '0.5px solid var(--bd1)',
        borderRadius: '16px',
        boxShadow: '0 24px 64px rgba(15,27,45,.4)',
        overflow: 'hidden',
      }}>
        {/* Top progress stripe */}
        <div style={{ height: '3px', background: 'var(--bd0)' }}>
          <div style={{
            height: '100%',
            background: 'var(--amber-b)',
            width: `${((step + 1) / steps.length) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>

        <div style={{ padding: '22px 24px' }}>
          {/* Step counter */}
          <div style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--amber-b)',
            marginBottom: '9px', fontFamily: '"DM Mono",monospace',
          }}>
            {step + 1} / {steps.length}
          </div>

          {/* Title */}
          <div style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: '20px', fontWeight: 700, color: 'var(--t1)',
            lineHeight: 1.2, marginBottom: '10px',
          }}>
            {current.title}
          </div>

          {/* Body */}
          <div style={{
            fontSize: '13.5px', color: 'var(--t2)',
            lineHeight: 1.65, marginBottom: '22px',
          }}>
            {current.body}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleSkip}
              style={{
                fontSize: '12px', color: 'var(--t4)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif', padding: '0',
              }}
            >
              Skip guide
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Dot indicators */}
              <div style={{ display: 'flex', gap: '5px' }}>
                {steps.map((_, i) => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: i === step ? 'var(--amber-b)' : 'var(--bd1)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>

              <button
                onClick={handleNext}
                style={{
                  background: 'var(--amber-b)', color: 'white',
                  border: 'none', borderRadius: '9px',
                  padding: '8px 18px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                  transition: 'background 0.13s',
                }}
              >
                {isLast ? 'Got it ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Hook — returns whether the tutorial for a given page should be shown */
export function useTutorial(page: FirstTimeTutorialProps['page']): boolean {
  const [shouldShow, setShouldShow] = useState(false)
  useEffect(() => {
    // Run client-side only
    const done = getTutorialsDone()
    setShouldShow(!done.has(page))
  }, [page])
  return shouldShow
}
