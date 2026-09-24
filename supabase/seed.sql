-- Optional seed — run AFTER schema.sql to have demo data in Supabase
-- Replace the user_id uuids with real auth.users ids if you want ownership to work.

insert into public.complaints (user_name, title, description, category, block, status, upvotes_count)
values
('Aarav Patel', 'No water supply on 3rd floor, Block B', 'No water since morning 6 AM in rooms 301-315. Tanks seem empty.', 'Water', 'Block B', 'open', 14),
('Sneha Reddy', 'Wifi down in library wing', 'Library wifi connects but no internet since yesterday. Exam week impact.', 'Wifi', 'Library', 'in_progress', 22),
('Rahul Verma', 'Tube light + fan not working, Room 204', 'Fan makes noise and stops, tube light flickering.', 'Electricity', 'Block A', 'open', 7),
('Priya Nair', 'Washrooms not cleaned for 3 days, Block C', 'Ground floor washrooms stink, bins overflowing.', 'Cleaning', 'Block C', 'open', 18),
('Divya Sharma', 'Street light dead near girls hostel gate', 'Path from main gate to Block D fully dark after 7 PM. Safety issue.', 'Electricity', 'Block D', 'resolved', 25);
