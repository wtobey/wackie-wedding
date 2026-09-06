import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing database connection...\n');

  // Test polaroids table
  const { data: rows, error: dbError } = await supabase
    .from('polaroids')
    .select('*')
    .limit(5);

  console.log('Polaroids table:');
  console.log('  Error:', dbError?.message || 'none');
  console.log('  Rows:', rows || []);

  // Test storage bucket
  console.log('\nStorage bucket (polaroids):');
  const { data: files, error: storageError } = await supabase.storage
    .from('polaroids')
    .list();

  console.log('  Error:', storageError?.message || 'none');
  console.log('  Files:', files || []);
}

test();
