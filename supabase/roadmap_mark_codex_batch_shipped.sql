-- Personal Support Map, data import/export, and the restored modular Home
-- screen (with intention mode) are all live now - built in the same batch
-- as Aurora AI, weight/food tracking, and the intimacy tracker, but never
-- marked shipped on the public roadmap.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug in ('personal-support-map', 'data-import-escape-hatch', 'modular-home-screen');
