DROP TABLE IF EXISTS "todos";

-- Remove the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'todos_user_id_profiles_user_id_fk'
    ) THEN
        ALTER TABLE "todos" DROP CONSTRAINT "todos_user_id_profiles_user_id_fk";
    END IF;
END $$; 