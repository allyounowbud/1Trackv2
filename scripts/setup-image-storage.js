/**
 * Setup Image Storage for Scrydex Image Caching
 * Creates Supabase storage bucket and policies for image caching
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupImageStorage() {
  console.log('🖼️ Setting up image storage for Scrydex caching...\n');

  try {
    // Create storage bucket for cached images
    console.log('📦 Creating storage bucket: cached-images');
    
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket(
      'cached-images',
      {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit per file
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg']
      }
    );

    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError;
    }

    if (bucket) {
      console.log('✅ Storage bucket created successfully');
    } else {
      console.log('✅ Storage bucket already exists');
    }

    // Create storage policies
    console.log('\n🔒 Setting up storage policies...');

    // Policy 1: Allow public read access to cached images
    const publicReadPolicy = {
      bucket_id: 'cached-images',
      name: 'Public read access for cached images',
      definition: 'true',
      check: 'true',
      command: 'SELECT'
    };

    const { error: policyError1 } = await supabase.rpc('create_storage_policy', publicReadPolicy);
    
    if (policyError1 && !policyError1.message.includes('already exists')) {
      console.warn('⚠️ Could not create public read policy:', policyError1.message);
    } else {
      console.log('✅ Public read policy created');
    }

    // Policy 2: Allow authenticated users to upload images
    const uploadPolicy = {
      bucket_id: 'cached-images',
      name: 'Authenticated upload access',
      definition: 'auth.role() = \'authenticated\'',
      check: 'auth.role() = \'authenticated\'',
      command: 'INSERT'
    };

    const { error: policyError2 } = await supabase.rpc('create_storage_policy', uploadPolicy);
    
    if (policyError2 && !policyError2.message.includes('already exists')) {
      console.warn('⚠️ Could not create upload policy:', policyError2.message);
    } else {
      console.log('✅ Upload policy created');
    }

    // Create a test file to verify setup
    console.log('\n🧪 Testing storage setup...');
    
    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    const testFileName = `test-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cached-images')
      .upload(testFileName, testImageData, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.warn('⚠️ Test upload failed:', uploadError.message);
    } else {
      console.log('✅ Test upload successful');
      
      // Clean up test file
      await supabase.storage
        .from('cached-images')
        .remove([testFileName]);
      
      console.log('✅ Test file cleaned up');
    }

    // Get bucket info
    const { data: bucketInfo } = await supabase.storage.getBucket('cached-images');
    
    console.log('\n📊 Storage bucket configuration:');
    console.log(`   Name: ${bucketInfo?.name}`);
    console.log(`   Public: ${bucketInfo?.public}`);
    console.log(`   File size limit: ${bucketInfo?.file_size_limit} bytes`);
    console.log(`   Allowed MIME types: ${bucketInfo?.allowed_mime_types?.join(', ')}`);

    console.log('\n🎉 Image storage setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Your app can now cache Scrydex images locally');
    console.log('   2. Images will be stored in the "cached-images" bucket');
    console.log('   3. Public read access allows fast image loading');
    console.log('   4. Consider setting up CDN for even better performance');

  } catch (error) {
    console.error('❌ Failed to setup image storage:', error);
    process.exit(1);
  }
}

// Run the setup
setupImageStorage();

