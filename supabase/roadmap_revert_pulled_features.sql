-- Custom Home, Low-Energy Mode's home-screen tie-in, the focus picker,
-- Gender Euphoria Journal, Social Transition Planner, Appointment Builder,
-- Gentle Mode, and Accessibility Profiles all shipped without a proper
-- review pass. Pulling them back out of the live app (see the matching code
-- removal commits) and flipping these six roadmap cards from "available"
-- back to "next" so the roadmap doesn't claim they're there when they're
-- not. This is "not yet", not "never" - copy is written accordingly.

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 130,
    description = 'A guided, private space to prepare questions, notes, documents and follow-ups before and after an appointment.'
where slug = 'appointment-builder';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 140,
    description = 'An optional calmer experience for people who find tracking stressful: less pressure, fewer numbers and only the essentials.'
where slug = 'gentle-mode';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 150,
    description = 'Optional presets for low vision, reduced motion, large touch targets, low cognitive load and more, while keeping every setting adjustable.'
where slug = 'accessibility-profiles';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 160,
    description = 'Personal control over what the dashboard shows, hides, pins and prioritises on different devices.'
where slug = 'modular-home-screen';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 170,
    description = 'A positive private journal for affirming moments and celebrations, with optional time capsules for entries someone chooses to revisit later.'
where slug = 'gender-euphoria-journal';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 180,
    description = 'Private help to organise coming out, safety considerations, name changes and administrative tasks at a person''s own pace.'
where slug = 'social-transition-planner';
