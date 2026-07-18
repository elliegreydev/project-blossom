-- Voice Studio (recording + practice + goal tools) and on-device voice
-- analysis (live pitch view) are both live. Keep the public roadmap honest
-- without changing any staff edits beyond these two entries.

update public.product_roadmap
set stage = 'available', is_recent = true
where slug = 'voice-studio';

update public.product_roadmap
set stage = 'available', is_recent = true
where slug = 'on-device-voice-analysis';
