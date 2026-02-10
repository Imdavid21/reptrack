import type { BlogPost } from './blogPosts';

export const blogPostsProduct: BlogPost[] = [
  // ===== PRODUCT 1 =====
  {
    slug: 'how-to-log-your-first-workout-in-reptrack',
    title: 'How to Log Your First Workout in RepTrack (Step by Step)',
    primaryKeyword: 'how to log workout in RepTrack',
    secondaryKeywords: ['RepTrack tutorial', 'workout logging app guide', 'first workout log', 'RepTrack getting started', 'log sets and reps app'],
    intent: 'transactional',
    metaTitle: 'Log Your First Workout in RepTrack | Guide',
    metaDescription: 'Step-by-step guide to logging your first workout in RepTrack. From choosing your split to completing your last set. Takes 2 minutes to learn.',
    funnel: 'bofu',
    heroImage: '/blog/log-first-workout.jpg',
    tldr: 'Open RepTrack, pick your training day, review your exercises, and start logging sets. Each set takes one tap to complete. Your previous weights load automatically so you always know what to beat.',
    publishDate: '2026-05-21',
    content: `## The Problem

You downloaded a workout tracker but spent 10 minutes trying to figure out how it works. By the time you found the right screen, your rest period was over and the gym was closing.

Logging should not require a tutorial. But since you are here, this one takes 2 minutes.

## How RepTrack Works

**RepTrack follows a simple three-step flow: pick your day, review your exercises, log your sets.** There is no setup wizard, no 15-screen onboarding, no mandatory profile photo. You can log your first set within 60 seconds of opening the app.

### Step 1: Choose Your Training Day

When you open the Log Workout screen, you see your training days listed based on your chosen split. If you picked a 6-day PPL split, you see Push A, Pull A, Legs A, Push B, Pull B, Legs B. Tap the day you are training today.

You also pick the date and week number. Most of the time, today's date is already selected.

### Step 2: Review Your Exercises

After selecting a day, you see all exercises for that session listed with their target weights and rep ranges. This is your chance to:

- Swap an exercise if equipment is busy
- Add an exercise you want to include today
- Remove something you want to skip
- Rearrange the order

Each exercise shows whether it is a primary compound or an accessory movement. Primary exercises appear first because that is how you should train.

**The key feature here:** RepTrack loads your last-used weights automatically. If you benched 70kg x 8 last Push day, it shows 70kg x 8 as your starting point today. No scrolling through history. No mental math.

### Step 3: Log Set by Set

Tap "Start Session" and you enter the set-by-set logging view. For each set, you see:

- The target weight (pre-filled from your last session)
- The target reps (from your program)
- Input fields for actual weight and actual reps

Your target values appear as placeholders. If you hit the same numbers, just tap "Complete Set" without changing anything. If you went heavier or got more reps, adjust the numbers. One tap per set.

When you finish all sets for an exercise, you move to the next one automatically. When you finish the last exercise, you save the workout.

### What Gets Saved

Every completed workout stores:

| Data Point | What It Does |
|-----------|-------------|
| Exercise name | Tracks which movements you did |
| Weight per set | Enables progressive overload tracking |
| Reps per set | Detects rep PRs automatically |
| Sets completed | Calculates total volume |
| Session duration | Shows how long you trained |
| Date and day | Builds your training history |

## Tips for Your First Session

1. **Do not adjust target weights on your first log.** Just record what you actually lift. The app will use these numbers next time.
2. **Skip warm-up sets.** Only log working sets to keep your data clean.
3. **Use the overview mode** if you prefer seeing all exercises at once instead of one at a time.
4. **Do not stress about perfect data.** Getting something logged is better than getting nothing perfect.

## Common Questions

**Q: What if I do an exercise that is not in my program?**
A: Tap the "+" button on the review screen to add any exercise.

**Q: Can I change the weight mid-set?**
A: Yes. Just type the actual weight you used.

**Q: What happens if the app closes mid-workout?**
A: RepTrack auto-saves your draft every few seconds. Open it again and your session is right where you left it.

**Q: How do I see my previous weights?**
A: They load automatically as your target values. You do not need to look anything up.

**Q: Can I log a custom workout without a program?**
A: Yes. Choose "Freestyle" to build a session from scratch.

## Start Logging

Your first workout log takes 60 seconds to set up. After that, each session takes less time than finding a free bench. Open RepTrack, pick your day, and start. Your future self wants this data.`,
    internalLinks: ['how-to-track-workouts-properly', 'your-first-90-days-of-tracking', 'best-way-to-track-progressive-overload'],
  },

  // ===== PRODUCT 2 =====
  {
    slug: 'how-reptrack-tracks-personal-records',
    title: 'How RepTrack Tracks Your Personal Records Automatically',
    primaryKeyword: 'automatic PR tracking app',
    secondaryKeywords: ['personal record tracker', 'workout PR detection', 'track PRs automatically', 'strength PR app', 'rep PR tracking'],
    intent: 'transactional',
    metaTitle: 'Automatic PR Tracking in RepTrack | Guide',
    metaDescription: 'RepTrack detects weight PRs and rep PRs automatically. No manual tracking needed. Here is how the system works and what it catches.',
    funnel: 'bofu',
    heroImage: '/blog/track-pr-guide.jpg',
    tldr: 'Every time you log a set, RepTrack compares it against your entire history. New weight PR? It flags it. More reps at the same weight? That is a rep PR. You never miss a personal best again.',
    publishDate: '2026-05-23',
    content: `## The Problem

You hit a new bench PR three weeks ago but you cannot remember what it was. Was it 75kg x 8 or 77.5kg x 7? You think your squat PR is 100kg but you are not sure if you actually completed all 5 reps that day.

Manually tracking PRs in a notebook or spreadsheet means comparing dozens of entries across months. Most people stop doing it after a few weeks.

## How RepTrack Handles PRs

**RepTrack automatically compares every completed set against your full training history for that exercise.** When you beat a previous best, it detects it immediately and highlights it on your dashboard.

### What Counts as a PR

RepTrack tracks two types of personal records:

| PR Type | Definition | Example |
|---------|-----------|---------|
| Weight PR | Heaviest weight used for a given rep count | Bench: 80kg x 5 (previous best: 77.5kg x 5) |
| Rep PR | Most reps at a given weight | Bench: 70kg x 12 (previous best: 70kg x 10) |

Both matter. A rep PR at 70kg is just as meaningful as a weight PR at 80kg. They tell you different things about your strength.

### Where You See PRs

Your dashboard shows a Personal Records section with your current best lifts across all exercises. You can see:

- Your top weight for each exercise
- The date you set each PR
- How it compares to your starting numbers

### How It Works Under the Hood

1. You complete a set (e.g., Squat 90kg x 6)
2. RepTrack checks all previous squat sets in your history
3. If 90kg x 6 exceeds your previous best at 90kg (say, 90kg x 5), it is flagged as a rep PR
4. If 90kg is the heaviest you have ever squatted for 6+ reps, it is flagged as a weight PR
5. The PR appears on your dashboard instantly

### Real-World Example

Say you have been benching for 3 months:

| Date | Weight | Reps | PR? |
|------|--------|------|-----|
| Week 1 | 60kg | 8 | First entry (baseline) |
| Week 3 | 60kg | 10 | Rep PR at 60kg |
| Week 5 | 62.5kg | 8 | Weight PR |
| Week 7 | 62.5kg | 10 | Rep PR at 62.5kg |
| Week 9 | 65kg | 7 | Weight PR |

Five PRs in 9 weeks. Without tracking, you would have noticed maybe one of these.

## Why Automatic PR Tracking Matters

- **Motivation:** Seeing PRs pile up keeps you coming back
- **Validation:** You know your program is working because the data proves it
- **Awareness:** You catch PRs you would have missed (like a rep PR on accessories)
- **History:** Every PR is dated, so you can see your rate of progress

## Tips for Getting the Most From PR Tracking

1. **Log every working set.** Skipped sets are missed PR opportunities.
2. **Use consistent exercise names.** "Bench Press" and "Flat Bench" will be tracked separately.
3. **Do not chase PRs every session.** Let them happen naturally through progressive overload.
4. **Check your PR page monthly.** The big picture is more valuable than individual celebrations.

## Common Questions

**Q: Does it track estimated 1RM?**
A: Your PR dashboard shows your actual best sets. Use them to estimate your 1RM using standard formulas.

**Q: What if I set a PR on a bad form day?**
A: Log it honestly. If the reps were sloppy, note it. But the weight moved, so it counts.

**Q: Can I see PRs for specific time periods?**
A: Your dashboard shows all-time bests. Your insights page shows trends over selected date ranges.

**Q: Does it track volume PRs?**
A: Total session volume is tracked in your workout history. You can spot volume PRs by reviewing weekly summaries.

## Every Rep Counted

RepTrack turns every logged set into a potential PR. You do not have to remember anything. You do not have to compare spreadsheets. Just lift, log, and let the app tell you when you have beaten yourself. That is the point.`,
    internalLinks: ['measure-real-strength-gains', 'what-is-progressive-overload', 'best-way-to-track-progressive-overload'],
  },

  // ===== PRODUCT 3 =====
  {
    slug: 'how-to-set-up-your-training-split-in-reptrack',
    title: 'How to Set Up Your Training Split in RepTrack',
    primaryKeyword: 'set up training split app',
    secondaryKeywords: ['RepTrack split setup', 'choose workout split', 'PPL setup app', 'upper lower split app', 'configure training program'],
    intent: 'transactional',
    metaTitle: 'Set Up Your Training Split in RepTrack',
    metaDescription: 'RepTrack supports PPL, Upper/Lower, and Full Body splits. Here is how to set one up in under a minute and start training with structure.',
    funnel: 'bofu',
    heroImage: '/blog/setup-split-guide.jpg',
    tldr: 'Open RepTrack, choose between Full Body (3 days), Upper/Lower (4 days), PPL (5 or 6 days). Each split comes pre-loaded with exercises. You can customize everything or use the AI to generate a routine based on your goals.',
    publishDate: '2026-05-25',
    content: `## The Problem

You know you need a structured split but setting one up in most apps takes 30 minutes of adding exercises one by one. By the time you finish configuring Day 3, you have lost the will to train.

## How RepTrack Handles Splits

**RepTrack comes with four pre-built split templates, each loaded with appropriate exercises, weights, and rep targets.** Pick one, and you have a complete program in one tap.

### Available Splits

| Split | Days/Week | Structure | Best For |
|-------|-----------|-----------|----------|
| Full Body | 3 | Full Body A, B, C | Beginners, busy schedules |
| Upper/Lower | 4 | Upper A, Lower A, Upper B, Lower B | Balanced recovery |
| Hybrid PPL | 5 | Push, Pull, Legs, Upper, Lower | High volume with flexibility |
| PPL x2 | 6 | Push/Pull/Legs repeated twice | Maximum frequency |

### Step-by-Step Setup

1. **Open the Log Workout page** for the first time
2. **Choose your split** from the four options presented
3. **Each day loads pre-configured:** exercise names, categories (primary/accessory), target weights, target reps
4. **Tap "Start Training"** and your split is active

That is it. No dragging exercises into slots. No building from scratch unless you want to.

### What Each Day Includes

Every pre-built day follows programming best practices:

- **2-3 primary compound exercises** listed first (bench, squat, deadlift, rows, OHP)
- **3-4 accessory exercises** for muscle coverage (lateral raises, curls, extensions, face pulls)
- **Target weights** calibrated for intermediate lifters (adjustable from your first session)
- **Rep ranges** matching the exercise type (5-8 for compounds, 10-15 for isolations)

### Customizing Your Split

After setup, you can modify any day:

- **Swap exercises:** Replace a barbell bench with dumbbells
- **Add exercises:** Want more arm work? Add it
- **Remove exercises:** Running short on time? Drop an accessory
- **Change targets:** Adjust weight and rep targets to match your level

### Using AI to Build a Custom Routine

If the templates do not fit your goals, use RepTrack's AI Routine Builder:

1. Tap the sparkle icon on the split selection screen
2. Describe your goals (e.g., "Build upper body strength, focus on chest and shoulders")
3. Pick your preferred split type and experience level
4. The AI generates a complete program with exercises, weights, and reps
5. Review and start training

The AI follows strict muscle coverage rules. It ensures every sub-muscle group is targeted across paired days. Push A and Push B will never have the same primary chest exercise.

## When to Change Your Split

| Signal | What to Do |
|--------|-----------|
| Cannot make all planned days consistently | Drop to fewer days |
| Recovery is fine, want more volume | Add a training day |
| Bored after 12+ weeks | Switch split structure |
| Training goals changed | Reconfigure exercises |

## Common Questions

**Q: Can I switch splits later?**
A: Yes. Go to settings and change your training split at any time. Your history is preserved.

**Q: What if I train a different number of days each week?**
A: Pick the split that matches your minimum reliable days. Extra sessions are a bonus.

**Q: Do I lose my exercise history if I switch?**
A: No. All logged workouts stay in your history regardless of split changes.

**Q: Can I have rest days built in?**
A: Yes. Configure rest days in your preferences. RepTrack will skip those days in your schedule.

## Pick Your Split Now

RepTrack removes the setup friction that stops most people from following a program. One tap, and you have a structured week of training. Customize later. Start training now.`,
    internalLinks: ['how-to-structure-a-workout-split', 'how-to-stop-random-workouts', 'how-to-log-your-first-workout-in-reptrack'],
  },

  // ===== PRODUCT 4 =====
  {
    slug: 'how-to-use-reptrack-heatmap-for-consistency',
    title: 'How to Use the RepTrack Heatmap to Build Gym Consistency',
    primaryKeyword: 'workout heatmap consistency',
    secondaryKeywords: ['gym streak tracker', 'training consistency heatmap', 'workout calendar heatmap', 'track gym attendance', 'workout streak app'],
    intent: 'transactional',
    metaTitle: 'RepTrack Heatmap: Build Gym Consistency',
    metaDescription: 'The RepTrack heatmap shows your training frequency at a glance. Green squares for workouts, gaps for missed days. Build streaks that keep you accountable.',
    funnel: 'bofu',
    heroImage: '/blog/consistency-streaks.jpg',
    tldr: 'Your RepTrack dashboard shows a GitHub-style heatmap of your training activity. Darker squares mean more volume that day. Gaps are visible immediately. The visual streak creates accountability that motivation cannot match.',
    publishDate: '2026-05-27',
    content: `## The Problem

You think you trained 4 times last week. But did you? You feel like you have been consistent this month. But have you? Without a visual record, your brain fills in the gaps with optimism.

## How the RepTrack Heatmap Works

**The heatmap on your RepTrack dashboard displays every day of the month as a square, colored by training activity.** Workout days light up. Rest days stay empty. Missed training days are immediately obvious.

### What the Heatmap Shows

- **Colored squares:** Days you logged a workout. Darker color means more training volume
- **Empty squares:** Days with no logged activity
- **Weekly patterns:** You can see at a glance whether you are hitting your target frequency
- **Monthly overview:** An entire month of training on one screen

### Why Visual Streaks Work

Research on habit formation shows that visual progress tracking is one of the strongest motivators. The "do not break the chain" effect is real. When you see 12 consecutive training days with colored squares, skipping feels harder than showing up.

The heatmap turns abstract goals ("I want to train 4x per week") into visible patterns you can see and judge instantly.

### How to Read Your Heatmap

| Pattern | What It Means | Action |
|---------|--------------|--------|
| Consistent color, even spacing | You are training on schedule | Keep going |
| Clusters with big gaps | You train in bursts then stop | Reduce days, increase consistency |
| Weekend gaps only | You skip weekends | Decide if that is intentional |
| Fading toward end of month | Motivation drops mid-month | Set a minimum viable workout for low days |
| Fully filled | Training every day | Check if you are recovering enough |

### Using the Heatmap for Accountability

1. **Check it every Sunday.** Count your colored squares from the past 7 days
2. **Compare to your target.** If you aim for 4 sessions and see 3, you know
3. **Spot patterns.** Do you always skip Mondays? Train twice on Fridays? The data reveals it
4. **Share your streak.** The visual is motivating even just for yourself

## Combining Heatmap with Weekly Progress

Your dashboard also shows a weekly summary with:

- Sessions completed vs target
- Total volume lifted
- Progress on key lifts

The heatmap gives you the macro view (am I showing up?). The weekly summary gives you the micro view (am I doing enough when I show up?).

## Common Questions

**Q: Does the heatmap count rest days?**
A: Rest days marked in your preferences are expected gaps. Unplanned skips are the ones to watch.

**Q: Can I see heatmaps for previous months?**
A: Your full training history is accessible through the history page.

**Q: What counts as a "workout" for the heatmap?**
A: Any logged session with at least one completed set.

**Q: Does logging a daily check-in count?**
A: Morning and evening check-ins are tracked separately. The heatmap reflects actual training sessions.

## Build Your Streak

Open RepTrack and look at your heatmap right now. Count the colored squares this week. That number is your real training frequency, not the number you tell yourself. Build from there.`,
    internalLinks: ['gym-consistency-how-to-not-quit', 'your-first-90-days-of-tracking', 'how-to-log-your-first-workout-in-reptrack'],
  },

  // ===== PRODUCT 5 =====
  {
    slug: 'how-to-track-calories-and-macros-in-reptrack',
    title: 'How to Track Calories and Macros in RepTrack',
    primaryKeyword: 'track calories workout app',
    secondaryKeywords: ['macro tracking with workout log', 'calorie tracker gym', 'nutrition tracking lifters', 'RepTrack calorie feature', 'AI food tracking app'],
    intent: 'transactional',
    metaTitle: 'Track Calories and Macros in RepTrack',
    metaDescription: 'RepTrack combines workout logging with calorie and macro tracking. Log meals, snap food photos for AI analysis, and see nutrition next to your training data.',
    funnel: 'bofu',
    heroImage: '/blog/calorie-tracking-guide.jpg',
    tldr: 'RepTrack lets you log meals with calories, protein, carbs, fat, and fiber. You can type them manually, describe your food in text for AI parsing, or snap a photo for AI-powered food recognition. All nutrition data sits alongside your training data in one app.',
    publishDate: '2026-05-29',
    content: `## The Problem

You track your workouts in one app and your calories in another. Neither talks to the other. You cannot see how your nutrition correlates with your training performance. You end up using two apps badly instead of one app well.

## How RepTrack Handles Nutrition

**RepTrack integrates calorie and macro tracking directly into the same app where you log your workouts.** One app for training and nutrition means you can see both on the same dashboard and spot correlations that separate apps miss.

### Three Ways to Log Meals

#### 1. Manual Entry
Type the food name, calories, and macros directly. Best for meals you eat regularly and already know the numbers for.

#### 2. AI Text Parsing
Describe your meal in plain text: "2 eggs, toast with butter, glass of milk." RepTrack's AI parses it into individual items with estimated calories and macros. Review, adjust if needed, confirm.

#### 3. AI Photo Analysis
Take a photo of your plate. The AI identifies the food, estimates portion sizes, and returns calorie and macro breakdowns. Confidence scores tell you how certain the AI is about its analysis.

### What Gets Tracked

| Nutrient | Why It Matters |
|----------|---------------|
| Calories | Total energy, determines weight change |
| Protein | Muscle repair and growth (1.6-2.2g/kg target) |
| Carbs | Training fuel, glycogen replenishment |
| Fat | Hormones, absorption, satiety |
| Fiber | Digestion, satiety, health |

### Daily View

Your dashboard shows a calorie summary for today:

- Total calories consumed vs your daily goal
- Macro breakdown (protein, carbs, fat as percentages)
- Meals logged by type (breakfast, lunch, dinner, snacks)
- Remaining calories and protein to hit targets

### Seeing Nutrition Alongside Training

This is where RepTrack differs from standalone calorie trackers. On your insights page, you can see:

- **Calorie intake on training days vs rest days.** Are you eating enough on workout days?
- **Protein consistency over time.** Are you hitting your target most days?
- **Performance correlation.** Did your bench go up during weeks you ate more protein?

These connections are invisible when your data lives in separate apps.

## Tips for Effective Calorie Tracking

1. **Track protein first.** Get within 10g of your target daily. The rest follows.
2. **Use AI text parsing for speed.** Typing "chicken breast 200g, rice 150g, broccoli" is faster than searching a food database.
3. **Photo analysis works best for single dishes.** Complex mixed plates reduce accuracy.
4. **Do not aim for perfection.** Within 100 calories is close enough for progress.
5. **Track for 2 weeks straight.** After that, you develop an intuition for portion sizes.

## Common Questions

**Q: Is the AI calorie estimation accurate?**
A: Within 10-15% for most whole foods. Less accurate for mixed restaurant dishes. Always check the confidence score.

**Q: Can I set custom calorie goals?**
A: Yes. Set your daily calorie and water goals in Settings.

**Q: Does it track water intake too?**
A: Yes. RepTrack has a dedicated water tracker on the dashboard.

**Q: Do I need to track calories every day?**
A: No. But tracking consistently for 2-3 weeks helps you build awareness of your eating patterns.

## One App, Complete Picture

Stop bouncing between a workout tracker and a calorie counter. RepTrack puts both in one place so you can finally see how nutrition drives your training results.`,
    internalLinks: ['how-much-protein-for-muscle-growth', 'how-to-log-your-first-workout-in-reptrack', 'data-driven-lifters-get-stronger'],
  },

  // ===== PRODUCT 6 =====
  {
    slug: 'how-to-use-reptrack-insights-page',
    title: 'How to Use the RepTrack Insights Page to Train Smarter',
    primaryKeyword: 'workout analytics insights',
    secondaryKeywords: ['training data analysis app', 'workout insights dashboard', 'gym progress analytics', 'training volume analysis', 'strength trends app'],
    intent: 'transactional',
    metaTitle: 'RepTrack Insights Page | Train Smarter',
    metaDescription: 'The RepTrack Insights page turns your raw workout data into actionable charts. Volume trends, strength curves, body part balance, and AI coaching tips.',
    funnel: 'bofu',
    heroImage: '/blog/insights-analytics.jpg',
    tldr: 'Your Insights page shows strength overview charts, body part volume distribution, sleep and energy correlations, weekly summaries, and AI-powered coaching tips. It turns months of logged data into clear visual trends you can act on.',
    publishDate: '2026-05-31',
    content: `## The Problem

You have been logging workouts for months. You have hundreds of data points. But they sit in a list of past sessions. You can see that you squatted 80kg on March 3rd, but you cannot easily see whether your squat has been trending up, down, or sideways over 12 weeks.

Raw data is not insight. Charts are.

## What the Insights Page Shows

**RepTrack's Insights page transforms your raw workout logs into visual analytics that answer the questions every lifter has.** No spreadsheet formulas. No manual calculations. Just charts that update as you train.

### Strength Overview

A line chart showing your top working weights over time for your main lifts. You can see at a glance:

- Is my bench trending up?
- When did my squat plateau?
- Which lifts are progressing fastest?

Select a date range (last 30 days, 90 days, 6 months, 1 year) to zoom in or out.

### Body Part Volume Distribution

A visual breakdown of how much volume (sets) each muscle group receives per week. This catches imbalances:

- Are you training chest twice as much as back?
- Are your legs getting enough volume?
- Is your side delt work sufficient?

The chart uses your exercise data to automatically classify volume by body part.

### Sleep and Energy Correlation

If you log your morning check-ins (sleep hours, energy level), the Insights page shows how these correlate with your training performance:

- Better sleep = stronger sessions?
- Low energy days = missed reps?
- Your personal patterns emerge after 4-6 weeks of data

### Weekly and Monthly Summaries

Cards showing your key metrics aggregated by week or month:

- Total sessions completed
- Total volume lifted (weight x reps x sets)
- Average session duration
- PRs set during the period
- Consistency score (sessions completed vs planned)

### AI Coach Insights

RepTrack analyzes your training data and generates personalized coaching tips:

- "Your bench volume has dropped 20% this month. Consider adding a set."
- "Your pull-to-push volume ratio is 0.7. Add more pulling work for balance."
- "Sleep hours correlate with your squat performance. Prioritize 7+ hours."

These are not generic tips. They come from your actual data.

## How to Use Insights Effectively

| Frequency | What to Check | Why |
|-----------|--------------|-----|
| Weekly | Strength overview trends | Catch plateaus early |
| Bi-weekly | Volume distribution | Spot imbalances |
| Monthly | Summary cards | Assess overall progress |
| Quarterly | Full date range analysis | Big picture trends |

## Tips for Getting Better Insights

1. **Log consistently.** Gaps in data create gaps in charts. Even a 3-exercise session counts.
2. **Log morning check-ins.** Sleep and energy data make your insights dramatically more useful.
3. **Use a date range longer than 30 days.** Short ranges show noise. Long ranges show trends.
4. **Act on what you see.** If the chart shows a plateau, change something. Data without action is decoration.

## Common Questions

**Q: How many sessions before Insights are useful?**
A: You start seeing meaningful trends after 3-4 weeks of consistent logging.

**Q: Can I see insights for specific exercises?**
A: The strength overview shows trends per exercise. Your workout history shows set-level detail.

**Q: Are the AI coaching tips always accurate?**
A: They are data-driven but not infallible. Treat them as suggestions, not commands.

**Q: Does it work with all training splits?**
A: Yes. Insights work regardless of your split choice.

## Data Into Decisions

Your logged workouts are the raw material. The Insights page is the refinery. Check it weekly, act on what you see, and train smarter than you did last month.`,
    internalLinks: ['data-driven-lifters-get-stronger', 'training-log-review-checklist', 'how-to-audit-your-training-program'],
  },

  // ===== PRODUCT 7 =====
  {
    slug: 'how-to-use-reptrack-ai-routine-builder',
    title: 'How to Use the RepTrack AI Routine Builder',
    primaryKeyword: 'AI workout routine generator',
    secondaryKeywords: ['AI training program builder', 'generate workout plan AI', 'custom routine generator', 'AI exercise selection', 'automated workout programming'],
    intent: 'transactional',
    metaTitle: 'RepTrack AI Routine Builder | Guide',
    metaDescription: 'Describe your goals and RepTrack AI builds a complete training program with exercises, sets, reps, and weights. Full muscle coverage guaranteed.',
    funnel: 'bofu',
    heroImage: '/blog/ai-routine-builder.jpg',
    tldr: 'Tell the AI your goals, pick a split, and it generates a complete program with exercises that cover every muscle sub-group. Push A gets different primary exercises than Push B. Every day is balanced. Review, adjust, and start training in under a minute.',
    publishDate: '2026-06-02',
    content: `## The Problem

You want a structured program but you do not know how to write one. You could copy a program from the internet, but it might not match your goals, equipment, or schedule. Personal trainers charge by the session. You need something in between.

## How the AI Routine Builder Works

**RepTrack's AI Routine Builder generates a complete, personalized training program based on your goals, experience level, and preferred training split.** It is not a random exercise picker. It follows strict programming rules that ensure comprehensive muscle coverage.

### Step-by-Step Process

1. **Open the AI Routine Builder** from the Log Workout screen (tap the sparkle icon)
2. **Describe your goals** in plain text: "Build upper body muscle, improve pull-up strength, general hypertrophy"
3. **Select your preferred split:** Full Body (3 days), Upper/Lower (4 days), PPL (5 or 6 days)
4. **Choose your experience level:** Beginner, Intermediate, or Advanced
5. **Tap Generate.** The AI builds your program in 10-15 seconds
6. **Review the exercises.** The first day loads on your review screen
7. **Start training** or adjust exercises before your first session

### What Makes the AI Programming Smart

The AI follows strict muscle coverage rules that most generic programs miss:

**Push Days:**
- Upper chest (incline pressing)
- Mid chest (flat pressing)
- Front delts (overhead work)
- Side delts (lateral raises)
- Triceps (pushdowns or extensions)

**Pull Days:**
- Lats/upper back (vertical pulls)
- Mid back/rhomboids (horizontal rows)
- Rear delts (face pulls or reverse flyes)
- Biceps with varied grips (supinated and neutral)
- Forearm work

**Legs Days:**
- Quad-dominant (squats, leg press)
- Hamstring-dominant (RDLs, curls)
- Glutes (hip thrusts, lunges)
- Calves

### The Variation Rule

When the AI creates paired days (like Push A and Push B), it uses different exercises for the same muscle group:

| Muscle Group | Push A Example | Push B Example |
|-------------|---------------|---------------|
| Primary chest | Barbell Bench Press | Incline Dumbbell Press |
| Secondary chest | Incline DB Flyes | Cable Crossovers |
| Primary shoulder | Seated DB Press | Barbell OHP |
| Side delts | Cable Laterals | DB Lateral Raises |
| Triceps | Rope Pushdowns | Overhead Extensions |

No exercise repeats across paired days. This maximizes stimulus variety and muscle development.

### Adjusting the Generated Program

After generation, you can:

- **Swap any exercise** for something you prefer or have equipment for
- **Change target weights** to match your current strength
- **Add or remove exercises** based on time constraints
- **Keep the routine permanently** as your active program

## Tips for Better AI-Generated Routines

1. **Be specific with goals.** "Build chest and fix weak shoulders" generates better results than "get fit."
2. **Mention equipment limitations.** "No leg press available, only barbells and dumbbells."
3. **Try different splits.** Generate a 4-day and a 6-day program to compare exercise selection.
4. **Trust the exercise order.** Compounds first, accessories after. The AI follows this automatically.

## Common Questions

**Q: Does the AI use my training history?**
A: The current version generates based on your stated goals and experience level. Your logged weights auto-populate from history once you start training.

**Q: Can I regenerate if I do not like the result?**
A: Yes. Tap generate again for a fresh program. Each generation is unique.

**Q: Are the weight suggestions accurate?**
A: They are calibrated for the experience level you select. Adjust based on your actual strength after your first session.

**Q: Will it create a periodized program?**
A: It creates a solid base program. Periodization (deloads, phase changes) is up to you to manage using RepTrack's data.

## Build Your Program Now

Describe your goals, pick a split, and let the AI handle the exercise selection. Review it, tweak it, and start training with a program that actually covers all your muscle groups. No more guessing what to do on Pull day.`,
    internalLinks: ['how-to-set-up-your-training-split-in-reptrack', 'how-to-structure-a-workout-split', 'first-12-week-program-guide'],
  },

  // ===== PRODUCT 8 =====
  {
    slug: 'how-to-track-water-intake-in-reptrack',
    title: 'How to Track Water Intake in RepTrack',
    primaryKeyword: 'water intake tracker app',
    secondaryKeywords: ['hydration tracking gym', 'daily water goal tracker', 'water logging app', 'hydration and performance', 'track water intake workout'],
    intent: 'transactional',
    metaTitle: 'Track Water Intake in RepTrack | Guide',
    metaDescription: 'RepTrack has a built-in water tracker on your dashboard. Tap to log glasses, set daily goals, and see how hydration affects your training.',
    funnel: 'bofu',
    heroImage: '/blog/water-tracking-guide.jpg',
    tldr: 'Your RepTrack dashboard has a water tracker. Tap to add 250ml per glass. Set a daily goal (default 3L). Track hydration alongside training and see patterns in your insights. Dehydrated training days show up in your data.',
    publishDate: '2026-06-04',
    content: `## The Problem

You know you should drink more water. You have tried reminder apps, marked bottles, and sticky notes. None of it sticks because none of it is connected to the thing you actually care about: your training performance.

## How RepTrack Handles Water Tracking

**Your RepTrack dashboard includes a water intake tracker that sits alongside your other daily metrics.** It is not a separate app. It is one tap away from your workout data, which means you actually use it.

### How It Works

1. **Find the water tracker** on your dashboard
2. **Tap to log** each glass (250ml per tap by default)
3. **Watch the progress bar** fill toward your daily goal
4. **Goal default is 3 liters** (configurable in Settings)

That is it. No bottle scanning, no complex measurements. Tap when you drink.

### Why Water Tracking Belongs in Your Workout App

Hydration directly affects training performance:

| Dehydration Level | Performance Impact |
|-------------------|-------------------|
| 1% body weight | Reduced endurance |
| 2% body weight | Strength drops 10-20% |
| 3%+ body weight | Significant cognitive and physical decline |

When your water data sits next to your training data, you can spot the correlation. Low water days often align with weaker sessions. You will not see this in a standalone hydration app.

### Setting Your Water Goal

Your daily goal depends on:

- **Bodyweight:** Roughly 30-35ml per kg of bodyweight
- **Training days:** Add 500-750ml for training sessions
- **Climate:** Increase in hot environments
- **Caffeine intake:** Coffee is mildly dehydrating; compensate with extra water

For most lifters, 2.5-3.5 liters per day is the target range.

### Tracking Over Time

Your Insights page includes hydration trends showing:

- Daily water intake over weeks and months
- Average hydration on training vs rest days
- Patterns in your drinking habits (do you forget on weekends?)

## Tips for Better Hydration Habits

1. **Log every glass as you drink it.** Do not try to remember at the end of the day.
2. **Front-load your intake.** Get 1 liter in before noon.
3. **Drink 500ml during your workout.** Log it right there in the gym.
4. **Check your weekly average,** not daily perfection. Consistency matters more.
5. **Set a realistic goal.** 3 liters is achievable. 5 liters is unnecessary for most people.

## Common Questions

**Q: Can I change the amount per tap?**
A: The default is 250ml per log entry.

**Q: Does it reset daily?**
A: Yes. Each day starts at zero.

**Q: Can I see my water history?**
A: Yes, through the Insights page hydration charts.

**Q: Is there a reminder feature?**
A: Not currently. The dashboard tracker serves as a passive visual reminder each time you open the app.

## Stay Hydrated, Lift Heavier

One tap per glass. That is the entire system. Open your dashboard, log your water, and watch how consistent hydration correlates with better sessions.`,
    internalLinks: ['how-to-log-your-first-workout-in-reptrack', 'rest-day-workout-recovery', 'how-to-use-reptrack-insights-page'],
  },

  // ===== PRODUCT 9 =====
  {
    slug: 'how-to-use-reptrack-morning-evening-checkins',
    title: 'How to Use RepTrack Morning and Evening Check-ins',
    primaryKeyword: 'daily check-in workout app',
    secondaryKeywords: ['morning health check-in', 'sleep tracking for lifters', 'energy tracking gym app', 'recovery check-in app', 'daily wellness tracker'],
    intent: 'transactional',
    metaTitle: 'RepTrack Morning & Evening Check-ins | Guide',
    metaDescription: 'RepTrack morning and evening check-ins track sleep, energy, bodyweight, and recovery. Here is how to use them to optimize training readiness.',
    funnel: 'bofu',
    heroImage: '/blog/morning-checkin-guide.jpg',
    tldr: 'RepTrack offers morning check-ins (sleep hours, energy level, bodyweight, heart rate) and evening check-ins (performance score, steps, notes). Logging these daily gives you recovery data that correlates directly with your training performance over time.',
    publishDate: '2026-06-06',
    content: `## The Problem

You train hard but ignore everything outside the gym. Sleep, energy, and recovery data go untracked. Then you wonder why some weeks you feel unstoppable and others you can barely finish your warm-up.

The gym is where you apply stress. Recovery is where you adapt. You track one but not the other.

## How Check-ins Work in RepTrack

**RepTrack has two daily check-in types: morning and evening.** Together, they capture the recovery data that explains your training performance.

### Morning Check-in

Log when you wake up:

| Field | What to Log | Why It Matters |
|-------|------------|---------------|
| Sleep hours | How long you slept | 7+ hours correlates with better training |
| Sleep time | When you went to bed | Consistency matters more than duration |
| Wake time | When you woke up | Tracks your rhythm |
| Energy level | 1-10 scale | Predicts session quality |
| Bodyweight | Morning weight, post-bathroom | Most accurate daily measurement |
| Heart rate | Resting HR | Elevated = under-recovered |
| Notes | Anything notable | Illness, stress, travel |

### Evening Check-in

Log at the end of your day:

| Field | What to Log | Why It Matters |
|-------|------------|---------------|
| Performance score | Rate your day 1-10 | Tracks overall productivity |
| Energy score | End-of-day energy | Chronic fatigue shows up here |
| Steps | Daily step count | Activity outside the gym |
| Rest day toggle | Was today a rest day? | Keeps rest patterns visible |
| Notes | Reflections | Stress, diet quality, mood |

### What You Get From Consistent Check-ins

After 2-4 weeks of daily check-ins, your Insights page reveals:

1. **Sleep-performance correlation:** Do you lift better after 8 hours vs 6?
2. **Bodyweight trends:** Weekly averages smooth out daily fluctuations
3. **Energy patterns:** Which days of the week are your lowest? Highest?
4. **Recovery readiness:** Elevated resting HR often means you need a lighter session

### How to Build the Check-in Habit

1. **Morning:** Log right after you wake up. Set your phone on the nightstand with RepTrack open
2. **Evening:** Log before bed as part of your wind-down routine
3. **Keep it fast:** Each check-in takes 30-60 seconds
4. **Do not skip weekends.** Recovery does not take days off

## Real Example: Using Check-in Data

Say your training log shows your squat dropped from 95kg x 6 to 90kg x 5 over two weeks. Without check-in data, you might think your program is bad.

With check-in data, you see:
- Sleep dropped from 7.5h to 5.5h average
- Energy ratings dropped from 7/10 to 4/10
- Bodyweight dropped 1.5kg (possible under-eating)

The answer is not "change your program." It is "sleep more and eat more." Your data tells you this. Without it, you are guessing.

## Common Questions

**Q: Do I have to log both morning and evening?**
A: No. Morning alone gives you the most valuable data (sleep, weight, energy).

**Q: How accurate does bodyweight need to be?**
A: Weigh yourself the same way each morning (after bathroom, before food). The trend matters more than any single number.

**Q: What if I forget a day?**
A: Skip it. One missed day does not ruin weeks of data.

**Q: Can I see check-in data on the Insights page?**
A: Yes. Sleep, energy, and bodyweight charts appear alongside your training analytics.

## Track the Full Picture

Training data alone tells you what happened. Check-in data tells you why. Two minutes a day of morning logging gives you the recovery insights that separate good training from great training.`,
    internalLinks: ['rest-day-workout-recovery', 'how-to-use-reptrack-insights-page', 'data-driven-lifters-get-stronger'],
  },

  // ===== PRODUCT 10 =====
  {
    slug: 'how-to-review-workout-history-in-reptrack',
    title: 'How to Review Your Workout History in RepTrack',
    primaryKeyword: 'workout history review app',
    secondaryKeywords: ['past workout data', 'training log history', 'workout journal review', 'gym history tracker', 'view old workouts app'],
    intent: 'transactional',
    metaTitle: 'Review Workout History in RepTrack',
    metaDescription: 'Your RepTrack history page shows every workout you have ever logged. Filter by date, see exercise details, and track how your numbers evolved.',
    funnel: 'bofu',
    heroImage: '/blog/workout-history-guide.jpg',
    tldr: 'The History page lists every logged workout with date, day name, exercise count, and total volume. Tap any session to see full set-by-set detail. Use it to compare sessions, prepare for today, or run a training audit.',
    publishDate: '2026-06-08',
    content: `## The Problem

You logged a great squat session last month but you cannot find it. Your notebook is full. Your Notes app has fragments of data scattered across dozens of entries. When you need to look up what you did 6 weeks ago, it takes 10 minutes of searching.

## How RepTrack History Works

**Every workout you log in RepTrack is stored permanently and accessible through the History page.** It is your complete training journal, searchable and organized by date.

### What You See on the History Page

Each entry shows:

- **Date** the workout was performed
- **Day name** (Push A, Legs B, Full Body C, etc.)
- **Number of exercises** completed
- **Total volume** for the session
- **Session duration** (start to finish)

### Tapping Into Detail

Tap any workout to see the full breakdown:

- Every exercise performed that session
- Set-by-set data: weight, reps, completed or not
- Pre-workout energy and motivation ratings
- Post-workout difficulty and satisfaction scores
- Session duration
- Any notes you added

This is the equivalent of a detailed coaching report for every session you have ever done.

### Using History to Prepare for Today

The most practical use of your history: review what you did last time you trained this day.

Before your Push A session:

1. Open History
2. Find your last Push A workout
3. See your working weights for bench, OHP, lateral raises
4. Know exactly what to beat today

RepTrack does this automatically by pre-loading last-used weights, but the history gives you full context when you want to dig deeper.

### Running a Training Audit With History

Every 4-8 weeks, review your history to answer:

| Question | How to Find It |
|----------|---------------|
| How many sessions did I complete? | Count entries in date range |
| Did my key lifts progress? | Compare same exercise across sessions |
| Am I skipping any days? | Look for missing day names |
| How long are my sessions? | Check average duration |
| Am I doing enough volume? | Compare total volume week over week |

### History vs Insights

| Feature | History | Insights |
|---------|---------|---------|
| Detail level | Set-by-set | Aggregated charts |
| Best for | Reviewing specific sessions | Spotting trends |
| Use case | "What did I bench last Tuesday?" | "Is my bench trending up?" |
| Frequency | Before each workout | Weekly review |

Both are essential. History is the raw footage. Insights is the highlight reel.

## Tips for Getting More From Your History

1. **Review before every session.** Takes 30 seconds. Saves you from guessing.
2. **Add notes to sessions.** "Felt heavy today" or "new gym, different bench" explains dips in data.
3. **Compare sessions 4 weeks apart.** Day-to-day variation is noise. Month-to-month change is signal.
4. **Use history during deloads.** Look at your pre-deload numbers so you know where to come back to.
5. **Do not delete bad sessions.** They are part of the data. Your worst days teach you the most.

## Common Questions

**Q: Can I edit a past workout?**
A: You can view all details of past sessions from your history page.

**Q: How far back does history go?**
A: All the way. Every session from your first log to today.

**Q: Can I export my history?**
A: Yes. RepTrack includes a data export feature in Settings.

**Q: Does history sync across devices?**
A: Yes. Your data is stored in the cloud and accessible from any device you log in to.

**Q: What if I logged wrong numbers?**
A: Note it for reference. One incorrect entry does not affect long-term trends.

## Your Complete Training Journal

Every session matters. Every set counts. Your RepTrack history is proof that you showed up, did the work, and got stronger. Open it before your next session and use it. That is the whole point.`,
    internalLinks: ['training-log-review-checklist', 'how-to-audit-your-training-program', 'how-to-log-your-first-workout-in-reptrack'],
  },
];
