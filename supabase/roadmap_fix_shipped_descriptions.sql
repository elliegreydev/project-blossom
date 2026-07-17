-- gender-euphoria-journal and social-transition-planner were flipped to
-- 'available' when they shipped, but their description text was never
-- updated off the old "Research-first idea for..." wording from when they
-- were still speculative 'later'-stage entries. Fixes the copy to describe
-- what's actually built, in the same present-tense style as other available
-- roadmap items.

update public.product_roadmap
set description = 'A private journal for affirming moments, confidence wins, voice and style moments, compliments and celebrations, with optional time capsules you choose to reopen later. Stays on your device and never syncs.'
where slug = 'gender-euphoria-journal';

update public.product_roadmap
set description = 'A private space to plan coming out conversations with scripts and safety notes, plus a life-admin checklist for name changes and other tasks, all at your own pace. Stays on your device and never syncs.'
where slug = 'social-transition-planner';
