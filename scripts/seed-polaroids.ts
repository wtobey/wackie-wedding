import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
console.log(supabase)

async function seedPolaroids() {
  // List all files in the bucket
  const { data: files, error: listError } = await supabase.storage
    .from('polaroids')
    .list();

  if (listError) {
    console.error('Failed to list files:', listError.message);
    process.exit(1);
  }

  if (!files || files.length === 0) {
    console.log('No files found in polaroids bucket');
    return;
  }

  console.log(`Found ${files.length} files`);

  // Get existing entries to avoid duplicates
  const { data: existing } = await supabase
    .from('polaroids')
    .select('image_path');

  const existingPaths = new Set(existing?.map(e => e.image_path) || []);

  // Insert new entries
  let inserted = 0;
  for (const file of files) {
    // Skip folders and hidden files
    if (!file.name || file.name.startsWith('.')) continue;

    if (existingPaths.has(file.name)) {
      console.log(`Skipping ${file.name} (already exists)`);
      continue;
    }

    const { error: insertError } = await supabase
      .from('polaroids')
      .insert({ image_path: file.name });

    if (insertError) {
      console.error(`Failed to insert ${file.name}:`, insertError.message);
    } else {
      console.log(`Inserted ${file.name}`);
      inserted++;
    }
  }

  console.log(`Done. Inserted ${inserted} new polaroids.`);
}

seedPolaroids();
