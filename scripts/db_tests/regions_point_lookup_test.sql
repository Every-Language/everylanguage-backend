-- Quick manual test for get_region_by_point RPC
-- Expected: country names for points in Singapore, Malaysia, Thailand

\echo 'Testing get_region_by_point for Singapore (103.8198, 1.3521)'
SELECT id, name, level FROM public.get_region_by_point(103.8198, 1.3521);

\echo 'Testing get_region_by_point for Kuala Lumpur (101.6869, 3.1390)'
SELECT id, name, level FROM public.get_region_by_point(101.6869, 3.1390);

\echo 'Testing get_region_by_point for Bangkok (100.5018, 13.7563)'
SELECT id, name, level FROM public.get_region_by_point(100.5018, 13.7563);

-- Test passing explicit level
\echo 'Testing with explicit level = country'
SELECT id, name, level FROM public.get_region_by_point(103.8198, 1.3521, 'country');


