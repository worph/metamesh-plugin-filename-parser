/**
 * Filename Parser Plugin
 * Parses video filenames to extract title, season, episode, year
 * Uses @metazla/filename-tools library for parsing
 */

import { env } from 'node:process';
import type { PluginManifest, ProcessRequest, CallbackPayload } from './types.js';
import { MetaCoreClient } from './meta-core-client.js';
import {
    FileNameVideoMetaExtractor,
    episodePatterns,
    seasonAndEpisodePatterns,
    seasonPatterns,
    extraEpKeyWords,
    keywordsArray,
    substringArray,
    soloEp
} from '@metazla/filename-tools';

export const manifest: PluginManifest = {
    id: 'filename-parser',
    name: 'Filename Parser',
    version: '1.0.0',
    description: 'Parses video filenames to extract title, season, episode, year, and quality',
    author: 'MetaMesh',
    dependencies: ['file-info'],
    priority: 20,
    color: '#2196F3',
    defaultQueue: 'fast',
    timeout: 30000,
    schema: {
        originalTitle: { label: 'Original Title', type: 'string' },
        videoType: { label: 'Video Type', type: 'string', hint: 'movie or tvshow' },
        season: { label: 'Season', type: 'string' },
        episode: { label: 'Episode', type: 'string' },
        movieYear: { label: 'Year', type: 'number' },
    },
    config: {},
};

/**
 * Emit the title-derived release tags (quality / codec / languages) added in the
 * filename-tools lib. **Opt-in (default off)** because these are title *guesses*:
 * in meta-sort the authoritative values come from probing the real stream
 * (ffmpeg / language plugin), and a title-guessed `languages/<iso>` set member
 * would pollute that. Gateway feeders (no real file) enable it via
 * `EMIT_TITLE_TAGS=true`; meta-sort leaves it off. (`real-probe > title-guess`.)
 */
const EMIT_TITLE_TAGS = /^(1|true|yes)$/i.test(env.EMIT_TITLE_TAGS ?? '');

// Create extractor instance with default config
const extractor = new FileNameVideoMetaExtractor(
    [], // watchFolderList - empty for plugin context
    episodePatterns,
    seasonAndEpisodePatterns,
    seasonPatterns,
    extraEpKeyWords,
    keywordsArray,
    substringArray,
    soloEp
);

export async function process(
    request: ProcessRequest,
    sendCallback: (payload: CallbackPayload) => Promise<void>
): Promise<void> {
    const startTime = Date.now();
    const metaCore = new MetaCoreClient(request.metaCoreUrl);

    try {
        const { cid, filePath } = request;

        // The parser operates on a name string. Accept it via filePath or, when
        // the caller has no file on disk (gateway feeder path), via
        // existingMeta.fileName. Skip cleanly if neither is present.
        const nameToParse = filePath || request.existingMeta?.fileName;
        if (!nameToParse) {
            await sendCallback({
                taskId: request.taskId,
                status: 'skipped',
                duration: Date.now() - startTime,
                reason: 'No filePath or existingMeta.fileName to parse',
            });
            return;
        }

        // Use the library to extract metadata
        const metadata = extractor.extractVideoFileMetadata(nameToParse);

        // Convert to record for merging
        const result: Record<string, string> = {};
        if (metadata.originalTitle) result.originalTitle = metadata.originalTitle;
        if (metadata.season) result.season = metadata.season;
        if (metadata.episode) result.episode = metadata.episode;
        if (metadata.increment) result.increment = metadata.increment;
        if (metadata.movieYear) result.movieYear = metadata.movieYear;
        if (metadata.videoType) result.videoType = metadata.videoType;
        if (metadata.extra) result.extra = metadata.extra;

        // Title-derived release tags — opt-in (see EMIT_TITLE_TAGS). quality /
        // codec are scalars; languages is a `languages/<iso> = "true"` key-set
        // (METADATA_KEYS §1), the same shape gateway feeders + meta-watch use.
        if (EMIT_TITLE_TAGS) {
            if (metadata.quality) result.quality = metadata.quality;
            if (metadata.codec) result.codec = metadata.codec;
            for (const lang of metadata.languages ?? []) {
                result[`languages/${lang}`] = 'true';
            }
            // contentKind mirrors videoType (movie→movie, tvshow→episode).
            // Gateway feeders retire their Rust filename port and rely on this
            // plugin as the sole filename source, so it owns this derivation
            // too (meta-watch reads contentKind to detect/aggregate episodes).
            // Gated with the other title-derived tags so meta-sort (the real
            // file is the authority there, flag off) is unaffected.
            if (metadata.videoType === 'tvshow') result.contentKind = 'episode';
            else if (metadata.videoType === 'movie') result.contentKind = 'movie';
        }

        if (Object.keys(result).length > 0) {
            await metaCore.mergeMetadata(cid, result);
        }

        await sendCallback({
            taskId: request.taskId,
            status: 'completed',
            duration: Date.now() - startTime,
        });
    } catch (error) {
        await sendCallback({
            taskId: request.taskId,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
