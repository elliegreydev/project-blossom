-- Blossom Social: one entry per phase from the community/social platform
-- concept the product owner is exploring, deliberately compressed from a
-- much larger internal phase plan (moderation policy, content boundaries,
-- safety architecture) that stays as internal design doc, not published
-- roadmap content. All 13 entries are "later" stage and carry the same
-- "Research-first" framing as the rest of that tier - this is explicitly
-- a long-term idea, not close to being built, and the source plan itself
-- says it "must not launch until the basic moderation and reporting
-- systems are ready."

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent)
values
  ('social-foundation-safety', 'Blossom Social - Foundation & safety research', 'Research-first idea for an optional community area. Before any social feature is built, this covers moderation policy, safety architecture, legal review and staffing - nothing else in this initiative starts until this is ready.', 'later', 300, false),
  ('social-profiles', 'Blossom Social - Separate social profiles', 'Research-first idea for an optional profile kept separate from your private Blossom profile, with its own name, avatar and visibility controls. Private tracking data never appears here automatically.', 'later', 310, false),
  ('social-circles', 'Blossom Social - Circles', 'Research-first idea for small, topic-based community spaces (early transition, voice practice, surgery support, and similar) instead of one large public feed, each with its own moderators and rules.', 'later', 320, false),
  ('social-posts-discussions', 'Blossom Social - Posts & discussions', 'Research-first idea for posts within Circles - questions, experiences, celebrations, polls - with content warnings, reply controls and clear labels separating personal experience from official information.', 'later', 330, false),
  ('social-celebration-garden', 'Blossom Social - Celebration Garden', 'Research-first idea for a space to share personal wins, with supportive reactions rather than public counts or rankings - no competitive milestones.', 'later', 340, false),
  ('social-qa', 'Blossom Social - Community Q&A', 'Research-first idea for a structured question space with clear answer labels (personal experience, community info, verified professional) - ordinary answers would never be presented as medical advice.', 'later', 350, false),
  ('social-buddy-matching', 'Blossom Social - Buddy matching', 'Research-first idea to optionally match people by shared interests or support goals - never using medical records, always opt-in on both sides, with easy blocking.', 'later', 360, false),
  ('social-messaging', 'Blossom Social - Private messaging', 'Research-first idea for request-based direct messages, off by default, with strict controls for new accounts. Not intended as crisis support or professional counselling.', 'later', 370, false),
  ('social-events', 'Blossom Social - Events', 'Research-first idea for member and organisation-hosted online and in-person events, with accessibility info and safety details - exact locations never exposed publicly by default.', 'later', 380, false),
  ('social-trusted-contributors', 'Blossom Social - Trusted contributors', 'Research-first idea for community roles (moderators, resource reviewers, peer volunteers) earned through conduct and review, not popularity or post counts.', 'later', 390, false),
  ('social-anonymous-posts', 'Blossom Social - Anonymous support posts', 'Research-first idea to allow anonymous posting in select, moderated Circles only, once moderation systems are mature - moderators could still identify accounts internally for safety.', 'later', 400, false),
  ('social-organisation-pages', 'Blossom Social - Organisation pages', 'Research-first idea for verified pages for charities and support organisations, with services, regions and contact info - verification would never be for sale.', 'later', 410, false),
  ('social-advanced-features', 'Blossom Social - Group chats, voice & video', 'Research-first idea for richer community tools (group chats, voice rooms, video events, local meet-up discovery) explored only once text-based Circles are stable and safely moderated.', 'later', 420, false)
on conflict (slug) do nothing;
