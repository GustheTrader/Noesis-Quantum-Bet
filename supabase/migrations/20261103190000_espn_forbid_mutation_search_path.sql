-- Slice 4: pin search_path on espn.forbid_mutation (Supabase advisor 0011 function_search_path_mutable).
-- The function references no tables, so an empty search_path is safe. Touches only schema `espn`.
alter function espn.forbid_mutation() set search_path = '';
