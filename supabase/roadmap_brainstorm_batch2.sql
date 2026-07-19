-- Two more from the same brainstorm (19 Jul 2026), not yet scoped or built.

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent) values
  ('multilingual-support', 'Multilingual support', 'Blossom in more than English, so support for a global need isn''t limited to whoever happens to read one language.', 'later', 520, false),
  ('injection-site-rotation', 'Injection site rotation tracker', 'For anyone on injectable HRT - a small, private way to track which site was used last, so rotation stays consistent without having to remember.', 'later', 530, false)
on conflict (slug) do nothing;
