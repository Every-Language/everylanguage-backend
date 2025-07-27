import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/response-utils.ts';
import { PackageQueries } from '../_shared/package-queries.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const packageType = url.searchParams.get('packageType');
    const audioVersionId = url.searchParams.get('audioVersionId');
    const textVersionId = url.searchParams.get('textVersionId');
    const languageEntityId = url.searchParams.get('languageEntityId');

    if (!packageType || !languageEntityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required parameters: packageType and languageEntityId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const queries = new PackageQueries(supabaseClient);

    // Diagnostic information
    const diagnostics: any = {
      request: {
        packageType,
        audioVersionId,
        textVersionId,
        languageEntityId,
      },
      steps: [],
      errors: [],
    };

    try {
      // Step 1: Check audio version
      if (audioVersionId) {
        diagnostics.steps.push('Fetching audio version...');
        const audioVersion =
          await queries.getAudioVersionWithAllData(audioVersionId);
        diagnostics.audioVersion = {
          found: !!audioVersion,
          mediaFilesCount: audioVersion?.mediaFiles?.length || 0,
          sampleFiles:
            audioVersion?.mediaFiles?.slice(0, 3).map(mf => ({
              id: mf.id,
              remote_path: mf.remote_path,
              duration: mf.duration_seconds,
            })) || [],
        };
        diagnostics.steps.push(
          `Audio version fetched: ${audioVersion?.mediaFiles?.length || 0} media files`
        );
      }

      // Step 2: Test single audio download
      if (audioVersionId && diagnostics.audioVersion?.mediaFilesCount > 0) {
        diagnostics.steps.push('Testing single audio file download...');
        try {
          const builder = new BiblePackageBuilder(supabaseClient);
          const firstFile = diagnostics.audioVersion.sampleFiles[0];

          // Try to download just the first file using our method
          const testResult = await (builder as any).downloadAudioFile(
            firstFile.remote_path
          );

          diagnostics.audioDownloadTest = {
            success: true,
            fileSize: testResult.length,
            fileName: firstFile.remote_path,
          };
          diagnostics.steps.push(
            `✅ Audio download test successful: ${testResult.length} bytes`
          );
        } catch (error) {
          diagnostics.audioDownloadTest = {
            success: false,
            error: error.message,
            fileName: diagnostics.audioVersion.sampleFiles[0]?.remote_path,
          };
          diagnostics.errors.push(
            `❌ Audio download test failed: ${error.message}`
          );
          diagnostics.steps.push(
            `❌ Audio download test failed: ${error.message}`
          );
        }
      }

      // Step 3: Test language entity
      if (languageEntityId) {
        diagnostics.steps.push('Checking language entity...');
        const langExists =
          await queries.validateLanguageEntityExists(languageEntityId);
        diagnostics.languageEntity = { exists: langExists };
        diagnostics.steps.push(`Language entity exists: ${langExists}`);
      }

      // Final summary
      diagnostics.summary = {
        audioVersionFound: diagnostics.audioVersion?.found || false,
        mediaFilesCount: diagnostics.audioVersion?.mediaFilesCount || 0,
        audioDownloadWorks: diagnostics.audioDownloadTest?.success || false,
        languageEntityExists: diagnostics.languageEntity?.exists || false,
        overallStatus:
          diagnostics.audioVersion?.mediaFilesCount > 0 &&
          diagnostics.audioDownloadTest?.success
            ? 'READY'
            : 'ISSUES_FOUND',
      };
    } catch (error) {
      diagnostics.errors.push(`Global error: ${error.message}`);
      diagnostics.steps.push(`❌ Global error: ${error.message}`);
    }

    return new Response(JSON.stringify(diagnostics, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Debug failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
