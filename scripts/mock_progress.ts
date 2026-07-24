import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'melgarmacky@gmail.com';
  console.log(`Mocking progress for ${email}...`);

  // 1. Get user ID
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error(`User not found with email ${email}`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`User ID: ${userId}`);

  // 2. Mock 12-week activity (daily_quests and answer_logs)
  console.log('Generating 12-week activity...');
  const activityData = [];
  const answerLogs = [];
  const today = new Date();
  for (let i = 0; i < 84; i++) {
    // 70% chance of being active on any given day
    if (Math.random() > 0.3) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const reviewsDone = Math.floor(Math.random() * 20) + 5;
      
      activityData.push({
        user_id: userId,
        quest_date: dateStr,
        lessons_done: Math.floor(Math.random() * 3), // 0 to 2
        reviews_done: reviewsDone
      });
      
      for (let j = 0; j < reviewsDone; j++) {
        const logDate = new Date(date);
        logDate.setHours(12 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60));
        answerLogs.push({
          user_id: userId,
          activity_id: null,
          item_id: '4e508bfd-df18-4621-a7d6-aea3ccc7f530', // Just any valid UUID from earlier
          context: 'review',
          activity_type: 'multiple_choice',
          skills: ['reading'],
          is_correct: Math.random() > 0.2,
          answered_at: logDate.toISOString()
        });
      }
    }
  }
  await supabase.from('daily_quests').upsert(activityData, { onConflict: 'user_id,quest_date' });
  
  // Insert answer logs in chunks
  console.log(`Inserting ${answerLogs.length} answer logs...`);
  for (let i = 0; i < answerLogs.length; i += 100) {
    await supabase.from('answer_logs').insert(answerLogs.slice(i, i + 100));
  }

  // 3. Mock level, XP, and streak
  console.log('Updating user_stats...');
  await supabase.from('user_stats').upsert({
    user_id: userId,
    total_xp: 8540,
    level: 10,
    current_streak: 24,
    longest_streak: 42,
    last_active_date: today.toISOString().split('T')[0],
    lessons_completed: 45,
    reviews_completed: 420
  }, { onConflict: 'user_id' });

  // 4. Mock badges
  console.log('Granting all badges...');
  const { data: badges } = await supabase.from('badges').select('id');
  if (badges && badges.length > 0) {
    const userBadges = badges.map(b => ({ user_id: userId, badge_id: b.id }));
    await supabase.from('user_badges').upsert(userBadges, { onConflict: 'user_id,badge_id' });
  }

  // 5. Mock mastery and skills
  console.log('Mocking item mastery...');
  const { data: items } = await supabase.from('learning_items').select('id').limit(150);
  if (items && items.length > 0) {
    const masteryData = items.map((item, i) => {
      // Create a mix of mastered, strong, familiar, learning
      let state = 'learning';
      let stage = 1;
      let score = 20;
      
      if (i < 50) { state = 'mastered'; stage = 6; score = 95; }
      else if (i < 90) { state = 'strong'; stage = 5; score = 80; }
      else if (i < 120) { state = 'familiar'; stage = 4; score = 60; }
      
      // Add some randomness to scores to make radar chart look realistic
      const rand = () => score + (Math.random() * 10 - 5);
      
      return {
        user_id: userId,
        item_id: item.id,
        state: state,
        srs_stage: stage,
        reading_score: Math.min(100, Math.max(0, rand() + 5)), // Slightly better at reading
        writing_score: Math.min(100, Math.max(0, rand() - 5)), // Slightly worse at writing
        listening_score: Math.min(100, Math.max(0, rand() + 2)),
        speaking_score: Math.min(100, Math.max(0, rand() - 10)), // Lowest at speaking
        consecutive_correct: stage * 2,
        total_correct: stage * 5,
        total_wrong: 2,
        unlocked_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // due tomorrow
        last_reviewed_at: new Date().toISOString()
      };
    });
    
    // Process in chunks to avoid payload limits
    for (let i = 0; i < masteryData.length; i += 50) {
      await supabase.from('user_item_mastery').upsert(
        masteryData.slice(i, i + 50),
        { onConflict: 'user_id,item_id' }
      );
    }
  }

  console.log('Done! Check the dashboard now.');
}

run().catch(console.error);
