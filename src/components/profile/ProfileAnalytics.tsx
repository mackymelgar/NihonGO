import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { useProfile } from '@/hooks/useProfile';
import { useLibrary } from '@/hooks/learner/useLibrary';
import { useEarnedBadges, useActivityCalendar } from '@/hooks/learner/useProfileData';
import { levelProgress } from '@/lib/xp';
import { localDateString } from '@/lib/dates';
import type { MasteryState, SkillType } from '@/lib/database.types';
import { ProgressRing } from '@/components/ProgressRing';
import { MasteryGem } from '@/components/MasteryGem';
import { cn } from '@/lib/utils';

const STATES: MasteryState[] = ['new', 'learning', 'weak', 'familiar', 'strong', 'mastered', 'forgotten'];

export function ProfileAnalytics() {
  const { data: stats } = useStats();
  const { data: profile } = useProfile();
  const { data: library } = useLibrary();
  const { data: badges } = useEarnedBadges();
  const { data: calendar } = useActivityCalendar();
  const tz = profile?.timezone ?? 'UTC';

  const lp = levelProgress(stats?.total_xp ?? 0);

  const { stateCounts, skillAvgs } = useMemo(() => {
    const counts: Record<string, number> = {};
    const sums = { reading: 0, writing: 0, listening: 0, speaking: 0 };
    for (const e of library ?? []) {
      counts[e.displayState] = (counts[e.displayState] ?? 0) + 1;
      sums.reading += e.reading_score;
      sums.writing += e.writing_score;
      sums.listening += e.listening_score;
      sums.speaking += e.speaking_score;
    }
    const n = Math.max(1, library?.length ?? 0);
    return {
      stateCounts: counts,
      skillAvgs: {
        reading: sums.reading / n,
        writing: sums.writing / n,
        listening: sums.listening / n,
        speaking: sums.speaking / n,
      },
    };
  }, [library]);

  return (
    <div className="flex flex-col gap-6">
      {/* Level + streak */}
      <div className="flex items-center gap-4 rounded-2xl bg-white/60 p-4 dark:bg-white/5">
        <ProgressRing fraction={lp.fraction} size={72} stroke={6}>
          <span className="text-lg font-extrabold">{lp.level}</span>
        </ProgressRing>
        <div className="flex-1">
          <p className="font-bold">Level {lp.level}</p>
          <p className="text-sm text-ink-muted">{lp.intoLevel} / {lp.span} XP to level {lp.level + 1}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" /> {stats?.current_streak ?? 0} day streak</span>
            <span className="text-ink-muted">Best: {stats?.longest_streak ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Activity calendar */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-ink-muted">Last 12 weeks</h2>
        <ContributionCalendar counts={calendar ?? new Map()} tz={tz} />
      </section>

      {/* Mastery breakdown + radar */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase text-ink-muted">Mastery</h2>
          {(library?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">No items learned yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {STATES.filter((s) => stateCounts[s]).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <MasteryGem state={s} />
                  <span className="font-semibold">{stateCounts[s]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase text-ink-muted">Skills</h2>
          <SkillRadar values={skillAvgs} />
        </div>
      </section>

      {/* Badge case */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-ink-muted">Badges</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {(badges ?? []).map((b) => (
            <div
              key={b.id}
              title={b.earned ? b.title : `${b.title} — ${b.description}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border p-2 text-center',
                b.earned ? 'border-accent/40 bg-accent/5' : 'border-black/10 opacity-40 grayscale dark:border-white/10',
              )}
            >
              <span className="text-2xl">{b.icon_emoji}</span>
              <span className="text-[10px] font-semibold leading-tight">{b.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContributionCalendar({ counts, tz }: { counts: Map<string, number>; tz: string }) {
  // 12 weeks × 7 days, ending today.
  const days: { key: string; count: number }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5);
    const key = localDateString(tz, d);
    days.push({ key, count: counts.get(key) ?? 0 });
  }
  function shade(c: number) {
    if (c === 0) return 'bg-black/10 dark:bg-white/10';
    if (c < 5) return 'bg-accent/30';
    if (c < 15) return 'bg-accent/60';
    return 'bg-accent';
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
      {days.map((d) => (
        <span key={d.key} title={`${d.key}: ${d.count}`} className={cn('h-3.5 w-3.5 rounded-sm', shade(d.count))} />
      ))}
    </div>
  );
}

function SkillRadar({ values }: { values: Record<SkillType, number> }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 24;
  const axes: { skill: SkillType; label: string; angle: number }[] = [
    { skill: 'reading', label: 'Read', angle: -90 },
    { skill: 'writing', label: 'Write', angle: 0 },
    { skill: 'listening', label: 'Listen', angle: 90 },
    { skill: 'speaking', label: 'Speak', angle: 180 },
  ];
  const pt = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const;
  };
  const poly = axes
    .map((ax) => {
      const [x, y] = pt(ax.angle, (values[ax.skill] / 100) * r);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[180px]">
      {[0.33, 0.66, 1].map((f, i) => (
        <polygon
          key={i}
          points={axes.map((ax) => pt(ax.angle, r * f).join(',')).join(' ')}
          className="fill-none stroke-black/10 dark:stroke-white/15"
        />
      ))}
      {axes.map((ax) => {
        const [lx, ly] = pt(ax.angle, r + 14);
        return (
          <text key={ax.skill} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-[9px]">
            {ax.label}
          </text>
        );
      })}
      <polygon points={poly} className="fill-accent/30 stroke-accent" strokeWidth={2} />
    </svg>
  );
}
